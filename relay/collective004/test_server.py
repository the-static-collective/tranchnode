import asyncio
import json
import sys
from pathlib import Path
import pytest
from aiohttp.test_utils import TestClient, TestServer

sys.path.insert(0,str(Path(__file__).resolve().parent))
from server import make_app

ROOM='Z'*43
ORIGIN={'Origin':'http://localhost:8000'}

@pytest.mark.asyncio
async def test_membership_signal_forwarding_and_teardown():
 async with TestServer(make_app()) as srv:
  async with TestClient(srv) as client:
   a=await client.ws_connect('/signal',headers=ORIGIN)
   await a.send_json({'type':'join','room':ROOM})
   welcome=await a.receive_json();assert welcome['type']=='welcome' and welcome['peers']==[]
   b=await client.ws_connect('/signal',headers=ORIGIN)
   await b.send_json({'type':'join','room':ROOM})
   w=await b.receive_json();assert w['peers']==[welcome['self']]
   arrived=await a.receive_json();assert arrived=={'type':'arrived','peer':w['self']}
   await a.send_json({'type':'offer','to':w['self'],'data':{'type':'offer','sdp':'dummy-sdp'}})
   forwarded=await b.receive_json()
   assert forwarded['type']=='offer' and forwarded['from']==welcome['self']
   await b.close()
   departed=await a.receive_json();assert departed=={'type':'departed','peer':w['self']}
   await a.close()

@pytest.mark.asyncio
async def test_no_cross_room_messages_and_no_directory():
 async with TestServer(make_app()) as srv:
  async with TestClient(srv) as client:
   a=await client.ws_connect('/signal',headers=ORIGIN)
   b=await client.ws_connect('/signal',headers=ORIGIN)
   await a.send_json({'type':'join','room':ROOM});aa=await a.receive_json()
   await b.send_json({'type':'join','room':'Y'*43});bb=await b.receive_json()
   assert not aa['peers'] and not bb['peers']
   await a.send_json({'type':'offer','to':bb['self'],'data':{'type':'offer','sdp':'x'}})
   failed=await a.receive();assert failed.type.name in ('CLOSE','CLOSED')
   assert b.closed is False
   await b.close()

@pytest.mark.asyncio
async def test_origin_restriction_and_bad_room():
 async with TestServer(make_app()) as srv:
  async with TestClient(srv) as client:
   with pytest.raises(Exception):
    await client.ws_connect('/signal',headers={'Origin':'https://evil.invalid'})
   a=await client.ws_connect('/signal',headers=ORIGIN)
   await a.send_json({'type':'join','room':'1234'})
   msg=await a.receive();assert msg.type.name in ('CLOSE','CLOSED')
