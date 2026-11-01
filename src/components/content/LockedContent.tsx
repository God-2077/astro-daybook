import { useEffect, useRef, useState } from 'react';

import type { LockedMessages } from '../../i18n/locale-types';
import Comments, { type CommentOptions } from '../comments/Comments';

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

interface Props {
  payload: LockedPayload;
  kind: 'daily' | 'post';
  comments: CommentOptions;
  /** 由服务端注入的已翻译文案；客户端不读取站点配置。 */
  messages: LockedMessages;
  /** e.g. “完 · 2026.10” — same ending line as a normal detail page. */
  endLabel: string;
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function decryptPayload(payload: LockedPayload, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(payload.salt) as BufferSource,
      iterations: payload.iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const ciphertext = fromBase64(payload.ciphertext);
  const tag = fromBase64(payload.tag);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) as BufferSource, tagLength: 128 },
    key,
    combined as unknown as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

export default function LockedContent({ payload, kind, comments, messages, endLabel }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [html, setHtml] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    document.querySelector('.a-detail')?.classList.add('is-unlocked');
    document.dispatchEvent(new CustomEvent('daybook:content-unlocked'));
  }, [unlocked]);

  const submit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!password) return;
    setError('');
    setShake(false);
    try {
      const decrypted = await decryptPayload(payload, password);
      setHtml(decrypted);
      setUnlocked(true);
      setPassword('');
    } catch {
      setError(messages.error);
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {!unlocked && (
        <div className={shake ? 'a-locked-card is-shake' : 'a-locked-card'} id="a-locked-card">
          <svg className="a-ico a-lock-ico" aria-hidden="true" focusable="false">
            <use href="#i-lock" />
          </svg>
          <h2>{messages.title}</h2>
          <p className="a-locked-note">{messages.note}</p>
          <form className="a-lock-form" data-lock-form onSubmit={submit}>
            <label className="a-sr" htmlFor="a-lock-input">
              {messages.password}
            </label>
            <input
              ref={inputRef}
              className="a-lock-input"
              id="a-lock-input"
              type="password"
              autoComplete="current-password"
              placeholder={messages.placeholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? 'true' : undefined}
              required
            />
            <button type="submit" className="a-btn a-btn-primary">
              {messages.unlock}
            </button>
          </form>
          <p className="a-lock-msg" id="a-lock-msg" role="status" aria-live="polite">
            {error}
          </p>
          <p className="a-lock-hint">{messages.hint}</p>
        </div>
      )}

      {unlocked && (
        <div className="a-locked-body" id="a-locked-body">
          <p className="a-unlock-note">{messages.unlocked}</p>
          <div
            className="a-prose"
            id={kind === 'daily' ? 'a-locked-diary-prose' : 'a-locked-article-prose'}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div className="a-endmark" aria-hidden="true">
            <span className="a-endmark-rule" />
            <svg
              className="a-endmark-art"
              viewBox="0 0 74 46"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M7 38h60" />
              <path d="M13 24l24-17 24 17" />
              <path d="M20 24v14h12v-7h8v7h13V24" />
              <path
                className="a-ill-accent"
                d="M55 10c-1.2-.9-4.2-3-4.2-5.4a2.4 2.4 0 0 1 4.2-1.6 2.4 2.4 0 0 1 4.2 1.6c0 2.4-3 4.5-4.2 5.4z"
              />
            </svg>
            <span className="a-endmark-text">{endLabel}</span>
            <span className="a-endmark-rule" />
          </div>

          {comments.enabled && (
            <section className="a-comments" aria-labelledby="a-locked-comments-title">
              <h2 id="a-locked-comments-title">
                <svg className="a-h2-star" aria-hidden="true">
                  <use href="#i-star" />
                </svg>
                {messages.comments}
              </h2>
              <Comments options={comments} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
