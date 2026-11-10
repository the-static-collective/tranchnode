"""COLLECTIVE-004 ephemeral WebRTC signaling relay. Never stores or forwards evidence."""
import asyncio
import json
import os
import re
import secrets
import time
from collections import defaultdict, deque
from aiohttp import web, WSMsgType

ROOM_RE = re.compile(r"^[A-Za-z0-9_-]{32,64}$")
MAX_FRAME = 48 * 1024
MAX_PEERS = 8
MAX_ROOMS = 128
RATE_WINDOW = 60
MAX_RATE = 180


def make_app(allowed_origins=None):
    origins = allowed_origins
    if origins is None:
        origins = [o.strip() for o in os.getenv('TRANCH_ALLOWED_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000').split(',') if o.strip()]
    rooms = defaultdict(dict)
    app = web.Application(client_max_size=MAX_FRAME)

    async def health(request):
        return web.json_response({'status': 'ready', 'purpose': 'WebRTC signaling only', 'persisted_evidence': False})

    async def signal(request):
        origin = request.headers.get('Origin')
        if origin not in origins:
            raise web.HTTPForbidden(text='Origin not authorized')
        ws = web.WebSocketResponse(max_msg_size=MAX_FRAME, heartbeat=20)
        await ws.prepare(request)
        room = None
        ident = None
        ticks = deque()
        try:
            try:
                first = await asyncio.wait_for(ws.receive(), timeout=12)
                if first.type != WSMsgType.TEXT:
                    raise ValueError('expected join')
                handshake = json.loads(first.data)
                if set(handshake) != {'type', 'room'} or handshake['type'] != 'join' or not isinstance(handshake['room'], str) or not ROOM_RE.fullmatch(handshake['room']):
                    raise ValueError('invalid room capability')
                room = handshake['room']
                if (room not in rooms and len(rooms) >= MAX_ROOMS) or len(rooms[room]) >= MAX_PEERS:
                    raise ValueError('room capacity reached')
            except (asyncio.TimeoutError, ValueError, json.JSONDecodeError) as e:
                await ws.close(code=1008, message=str(e).encode()[:100]); return ws
            ident = secrets.token_urlsafe(12)
            existing = list(rooms[room])
            rooms[room][ident] = ws
            await ws.send_json({'type': 'welcome', 'self': ident, 'peers': existing})
            for peer in existing:
                if not rooms[room][peer].closed:
                    await rooms[room][peer].send_json({'type':'arrived','peer': ident})
            async for msg in ws:
                if msg.type != WSMsgType.TEXT:
                    await ws.close(code=1003); break
                if len(msg.data) > MAX_FRAME:
                    await ws.close(code=1009); break
                now = time.monotonic()
                while ticks and now-ticks[0] > RATE_WINDOW:
                    ticks.popleft()
                ticks.append(now)
                if len(ticks) > MAX_RATE:
                    await ws.close(code=1008, message=b'rate limited'); break
                try:
                    packet = json.loads(msg.data)
                    if not isinstance(packet, dict) or packet.get('type') not in ('offer','answer','ice') or set(packet) != {'type', 'to', 'data'}:
                        raise ValueError('bad signal')
                    target = packet['to']
                    if not isinstance(target,str) or target not in rooms[room] or target == ident:
                        raise ValueError('unknown room peer')
                    data=packet['data']
                    if packet['type'] in ('offer','answer'):
                        if not isinstance(data,dict) or set(data) != {'type','sdp'} or data['type'] != packet['type'] or not isinstance(data['sdp'],str) or len(data['sdp']) > 24000:
                            raise ValueError('invalid description')
                    else:
                        if not isinstance(data,dict) or not isinstance(data.get('candidate'),str) or len(data['candidate']) > 5000 or any(k not in ('candidate','sdpMid','sdpMLineIndex','usernameFragment') for k in data):
                            raise ValueError('invalid candidate')
                    await rooms[room][target].send_json({'type':packet['type'],'from':ident,'data':data})
                except (ValueError,TypeError,json.JSONDecodeError):
                    await ws.close(code=1008, message=b'bad signal'); break
        finally:
            if ident is not None and room is not None:
                rooms[room].pop(ident, None)
                if rooms[room]:
                    # The disconnected socket's handler may be canceled while
                    # handling its close; do not cancel presence notices with it.
                    for peer in rooms[room].values():
                        if not peer.closed:
                            asyncio.create_task(peer.send_json({'type':'departed','peer':ident}))
                else:
                    rooms.pop(room, None)
        return ws

    app.router.add_get('/health', health)
    app.router.add_get('/signal', signal)
    return app

if __name__ == '__main__':
    port = int(os.getenv('PORT', '8765'))
    web.run_app(make_app(), host=os.getenv('BIND', '127.0.0.1'), port=port, access_log=None)
