const seen = new WeakSet<HTMLButtonElement>();

function fallbackCopy(text: string): boolean {
  const buffer = document.createElement('textarea');
  buffer.className = 'a-copy-buffer';
  buffer.value = text;
  buffer.setAttribute('readonly', '');
  document.body.append(buffer);
  buffer.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  buffer.remove();
  return ok;
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 浏览器拒绝剪贴板权限时继续走 execCommand 兜底。
    }
  }
  return fallbackCopy(text);
}

function setFeedback(button: HTMLButtonElement, state: 'copied' | 'failed'): void {
  const use = button.querySelector('use');
  const copyLabel = button.dataset.labelCopy ?? button.getAttribute('aria-label') ?? '';
  const label = state === 'copied' ? (button.dataset.labelCopied ?? copyLabel) : (button.dataset.labelFailed ?? copyLabel);
  button.dataset.copied = state;
  button.setAttribute('aria-label', label);
  button.title = label;
  use?.setAttribute('href', state === 'copied' ? '#i-check' : '#i-x');
  window.setTimeout(() => {
    delete button.dataset.copied;
    button.setAttribute('aria-label', copyLabel);
    button.title = copyLabel;
    use?.setAttribute('href', '#i-copy');
  }, 1800);
}

async function copyBlock(button: HTMLButtonElement): Promise<void> {
  const block = button.closest<HTMLElement>('.a-code-block');
  const pre = block?.querySelector<HTMLElement>('pre');
  if (!pre) return;
  const text = pre.textContent ?? '';
  if (!text) return;
  setFeedback(button, (await copyText(text)) ? 'copied' : 'failed');
}

function initButton(button: HTMLButtonElement): void {
  if (seen.has(button)) return;
  seen.add(button);
  button.hidden = false;
  button.addEventListener('click', () => {
    void copyBlock(button);
  });
}

/** 代码块复制按钮只在需要时加载；重复调用幂等。 */
export function initCodeCopy(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-code-copy]')) initButton(button);
}
