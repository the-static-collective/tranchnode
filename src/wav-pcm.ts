import type { Hash, ResidualBinding, SampleLocator } from "./residual.js";
import { sha256 } from "./residual.js";

export interface ArtifactReader {
  get(address: Hash | string): Promise<Uint8Array>;
}

export interface ParsedPcmWav {
  sampleRateHz: number;
  channels: 1 | 2;
  sampleFormat: "s16le";
  frameCount: number;
  dataOffset: number;
  dataByteLength: number;
}

export interface ExtractedPcmResidual {
  locator: SampleLocator;
  payload: Buffer;
  payloadHash: Hash;
  frameCount: number;
}

export class WavPcmError extends Error {
  constructor(
    public readonly code:
      | "MALFORMED_WAV"
      | "UNSUPPORTED_WAV"
      | "TRUNCATED_WAV"
      | "LOCATOR_MISMATCH"
      | "INVALID_SAMPLE_RANGE"
      | "RESIDUAL_HASH_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "WavPcmError";
  }
}

export function parsePcmWav(input: Uint8Array): ParsedPcmWav {
  const bytes = Buffer.from(input);
  if (bytes.byteLength < 12) {
    throw new WavPcmError("TRUNCATED_WAV", "WAV is shorter than the RIFF/WAVE header");
  }
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WAVE") {
    throw new WavPcmError("MALFORMED_WAV", "Expected RIFF/WAVE container");
  }

  const riffEnd = bytes.readUInt32LE(4) + 8;
  if (riffEnd > bytes.byteLength) {
    throw new WavPcmError("TRUNCATED_WAV", "RIFF size extends beyond available bytes");
  }
  if (riffEnd !== bytes.byteLength) {
    throw new WavPcmError("MALFORMED_WAV", "Trailing bytes exist outside the declared RIFF container");
  }

  let format: { sampleRateHz: number; channels: 1 | 2; blockAlign: number } | undefined;
  let dataOffset: number | undefined;
  let dataByteLength: number | undefined;
  let offset = 12;

  while (offset < riffEnd) {
    if (offset + 8 > riffEnd) {
      throw new WavPcmError("TRUNCATED_WAV", "Truncated WAV chunk header");
    }

    const chunkId = ascii(bytes, offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;
    const payloadEnd = payloadOffset + chunkSize;
    const paddedEnd = payloadEnd + (chunkSize & 1);
    if (payloadEnd > riffEnd || paddedEnd > riffEnd) {
      throw new WavPcmError("TRUNCATED_WAV", `Chunk ${chunkId} extends beyond the RIFF container`);
    }

    if (chunkId === "fmt ") {
      if (format) throw new WavPcmError("MALFORMED_WAV", "Multiple fmt chunks are not supported");
      if (chunkSize < 16) throw new WavPcmError("TRUNCATED_WAV", "PCM fmt chunk is shorter than 16 bytes");

      const audioFormat = bytes.readUInt16LE(payloadOffset);
      const channels = bytes.readUInt16LE(payloadOffset + 2);
      const sampleRateHz = bytes.readUInt32LE(payloadOffset + 4);
      const byteRate = bytes.readUInt32LE(payloadOffset + 8);
      const blockAlign = bytes.readUInt16LE(payloadOffset + 12);
      const bitsPerSample = bytes.readUInt16LE(payloadOffset + 14);

      if (audioFormat !== 1) throw new WavPcmError("UNSUPPORTED_WAV", `WAV format ${audioFormat} is not integer PCM`);
      if (channels !== 1 && channels !== 2) {
        throw new WavPcmError("UNSUPPORTED_WAV", `Only mono/stereo PCM is supported, got ${channels} channels`);
      }
      if (bitsPerSample !== 16) {
        throw new WavPcmError("UNSUPPORTED_WAV", `Only 16-bit little-endian PCM is supported, got ${bitsPerSample}-bit`);
      }
      if (sampleRateHz === 0) throw new WavPcmError("MALFORMED_WAV", "Sample rate must be positive");

      const expectedBlockAlign = channels * 2;
      const expectedByteRate = sampleRateHz * expectedBlockAlign;
      if (blockAlign !== expectedBlockAlign || byteRate !== expectedByteRate) {
        throw new WavPcmError("MALFORMED_WAV", "PCM fmt byte-rate/block-align fields are inconsistent");
      }
      format = { sampleRateHz, channels, blockAlign };
    } else if (chunkId === "data") {
      if (dataOffset !== undefined) throw new WavPcmError("MALFORMED_WAV", "Multiple data chunks are not supported");
      dataOffset = payloadOffset;
      dataByteLength = chunkSize;
    }

    offset = paddedEnd;
  }

  if (!format) throw new WavPcmError("MALFORMED_WAV", "WAV has no fmt chunk");
  if (dataOffset === undefined || dataByteLength === undefined) {
    throw new WavPcmError("MALFORMED_WAV", "WAV has no data chunk");
  }
  if (dataByteLength % format.blockAlign !== 0) {
    throw new WavPcmError("TRUNCATED_WAV", "PCM data chunk ends in a partial frame");
  }

  return {
    sampleRateHz: format.sampleRateHz,
    channels: format.channels,
    sampleFormat: "s16le",
    frameCount: dataByteLength / format.blockAlign,
    dataOffset,
    dataByteLength,
  };
}

/**
 * sample-v1 coordinates are PCM frame coordinates. A frame contains one sample
 * per channel. Extracted payload bytes retain WAV PCM interleaving exactly:
 * mono = [s0][s1]..., stereo = [L0][R0][L1][R1]..., each sample signed s16le.
 */
export function extractPcmSamples(input: Uint8Array, locator: SampleLocator): ExtractedPcmResidual {
  const bytes = Buffer.from(input);
  const wav = parsePcmWav(bytes);
  assertLocatorMatches(wav, locator);

  if (!Number.isSafeInteger(locator.startSample) || !Number.isSafeInteger(locator.endSampleExclusive)) {
    throw new WavPcmError("INVALID_SAMPLE_RANGE", "Sample coordinates must be safe integers");
  }
  if (locator.startSample < 0 || locator.endSampleExclusive <= locator.startSample) {
    throw new WavPcmError("INVALID_SAMPLE_RANGE", "Sample range must be non-empty and ordered");
  }
  if (locator.endSampleExclusive > wav.frameCount) {
    throw new WavPcmError(
      "INVALID_SAMPLE_RANGE",
      `Sample range [${locator.startSample}, ${locator.endSampleExclusive}) exceeds ${wav.frameCount} PCM frames`,
    );
  }

  const bytesPerFrame = wav.channels * 2;
  const startByte = wav.dataOffset + locator.startSample * bytesPerFrame;
  const endByte = wav.dataOffset + locator.endSampleExclusive * bytesPerFrame;
  const payload = Buffer.from(bytes.subarray(startByte, endByte));
  return {
    locator,
    payload,
    payloadHash: sha256(payload),
    frameCount: locator.endSampleExclusive - locator.startSample,
  };
}

export async function extractPcmResidualFromStore(
  store: ArtifactReader,
  locator: SampleLocator,
): Promise<ExtractedPcmResidual> {
  const sourceBytes = await store.get(locator.sourceArtifact);
  return extractPcmSamples(sourceBytes, locator);
}

export async function verifyExactPcmResidual(
  store: ArtifactReader,
  binding: ResidualBinding,
): Promise<ExtractedPcmResidual> {
  if (binding.preservationMode !== "exact_samples") {
    throw new WavPcmError("LOCATOR_MISMATCH", "PCM extraction only verifies exact_samples residuals");
  }
  const extracted = await extractPcmResidualFromStore(store, binding.source);
  if (extracted.payloadHash !== binding.extractedPayloadHash) {
    throw new WavPcmError(
      "RESIDUAL_HASH_MISMATCH",
      `Extracted PCM hashes to ${extracted.payloadHash}, expected ${binding.extractedPayloadHash}`,
    );
  }
  return extracted;
}

function assertLocatorMatches(wav: ParsedPcmWav, locator: SampleLocator): void {
  if (locator.locatorVersion !== "sample-v1") {
    throw new WavPcmError("LOCATOR_MISMATCH", `Unsupported locator version ${String(locator.locatorVersion)}`);
  }
  if (locator.sampleRateHz !== wav.sampleRateHz) {
    throw new WavPcmError("LOCATOR_MISMATCH", `Locator sample rate ${locator.sampleRateHz} != WAV ${wav.sampleRateHz}`);
  }
  if (locator.channels !== wav.channels) {
    throw new WavPcmError("LOCATOR_MISMATCH", `Locator channels ${locator.channels} != WAV ${wav.channels}`);
  }
  if (locator.sampleFormat !== wav.sampleFormat) {
    throw new WavPcmError("LOCATOR_MISMATCH", `Locator format ${locator.sampleFormat} != WAV ${wav.sampleFormat}`);
  }
}

function ascii(bytes: Buffer, start: number, end: number): string {
  return bytes.toString("ascii", start, end);
}
