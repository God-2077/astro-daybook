import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

import { encryptContent } from '../../src/lib/content/encrypt';

const { subtle } = webcrypto;

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

async function decrypt(html: string, password: string): Promise<string> {
  const payload = JSON.parse(html) as {
    salt: string;
    iv: string;
    ciphertext: string;
    tag: string;
    iterations: number;
  };
  const keyMaterial = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(payload.salt),
      iterations: payload.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const ciphertext = fromBase64(payload.ciphertext);
  const tag = fromBase64(payload.tag);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, combined);
  return new TextDecoder().decode(plain);
}

test('encrypts with AES-256-GCM and decrypts only with the right password', async () => {
  const payload = encryptContent('<p>只有密码能看见这句话。</p>', 'paper2024', 'test.md');
  assert.equal(payload.v, 1);
  assert.equal(payload.alg, 'AES-GCM');
  assert.equal(payload.kdf, 'PBKDF2-SHA256');
  assert.ok(payload.iterations >= 100_000);
  assert.equal(await decrypt(JSON.stringify(payload), 'paper2024'), '<p>只有密码能看见这句话。</p>');
  await assert.rejects(() => decrypt(JSON.stringify(payload), 'wrong-password'));
});
