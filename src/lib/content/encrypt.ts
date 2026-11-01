import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { ContentError } from '../errors';

export const PBKDF2_ITERATIONS = 150_000;
export const PBKDF2_DIGEST = 'sha256';
export const AES_KEY_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface LockedPayload {
  v: 1;
  alg: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

export function encryptContent(html: string, password: string, filePath: string): LockedPayload {
  if (!password) throw new ContentError(filePath, 'password 不能为空');
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, AES_KEY_BITS / 8, PBKDF2_DIGEST);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(html, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/** 只用于构建期检查，不要在前端 import。 */
export function contentFingerprint(entryFile: string, body: string): string {
  return createHash('sha256').update(`${entryFile}\n${body}`).digest('hex').slice(0, 16);
}
