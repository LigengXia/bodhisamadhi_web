import { describe, it, expect } from 'vitest';

import { findEmbeddedPicture } from './upload';

// A minimal but valid JPEG byte run: SOI + a segment + EOI.
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x41, 0x42, 0xff, 0xd9];
const PNG = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const be32 = (n: number) => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];
const be24 = (n: number) => [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const syncsafe = (n: number) => [
  (n >> 21) & 0x7f,
  (n >> 14) & 0x7f,
  (n >> 7) & 0x7f,
  n & 0x7f,
];

function tag(version: number, frames: number[]): Uint8Array {
  return new Uint8Array([
    ...ascii('ID3'),
    version,
    0x00,
    0x00,
    ...syncsafe(frames.length),
    ...frames,
  ]);
}

function apic(picture: number[], mime = 'image/jpeg', version = 3): number[] {
  // enc(0) + mime\0 + picture-type(0x03 front cover) + desc\0 + picture data
  const body = [0x00, ...ascii(mime), 0x00, 0x03, 0x00, ...picture];
  const size = version === 4 ? syncsafe(body.length) : be32(body.length);
  return [...ascii('APIC'), ...size, 0x00, 0x00, ...body];
}

function textFrame(id: string, text: string): number[] {
  const body = [0x00, ...ascii(text)];
  return [...ascii(id), ...be32(body.length), 0x00, 0x00, ...body];
}

describe('findEmbeddedPicture', () => {
  it('pulls a JPEG out of a v2.3 APIC frame', () => {
    const got = findEmbeddedPicture(tag(3, apic(JPEG)));
    expect(got?.mime).toBe('image/jpeg');
    expect([...(got?.bytes ?? [])]).toEqual(JPEG);
  });

  it('pulls a PNG out of an APIC frame', () => {
    const got = findEmbeddedPicture(tag(3, apic(PNG, 'image/png')));
    expect(got?.mime).toBe('image/png');
    expect([...(got?.bytes ?? [])]).toEqual(PNG);
  });

  it('skips a leading text frame to reach the picture', () => {
    const got = findEmbeddedPicture(
      tag(3, [...textFrame('TIT2', 'A chant'), ...apic(JPEG)]),
    );
    expect([...(got?.bytes ?? [])]).toEqual(JPEG);
  });

  it('reads a v2.4 syncsafe frame size', () => {
    const got = findEmbeddedPicture(tag(4, apic(JPEG, 'image/jpeg', 4)));
    expect([...(got?.bytes ?? [])]).toEqual(JPEG);
  });

  it('reads a v2.2 PIC frame', () => {
    const body = [0x00, ...ascii('JPG'), 0x03, 0x00, ...JPEG];
    const frame = [...ascii('PIC'), ...be24(body.length), ...body];
    const got = findEmbeddedPicture(tag(2, frame));
    expect([...(got?.bytes ?? [])]).toEqual(JPEG);
  });

  it('returns null when there is no picture frame', () => {
    expect(
      findEmbeddedPicture(tag(3, textFrame('TIT2', 'A chant'))),
    ).toBeNull();
  });

  it('returns null for bytes that are not an ID3 tag', () => {
    expect(findEmbeddedPicture(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBe(
      null,
    );
  });
});
