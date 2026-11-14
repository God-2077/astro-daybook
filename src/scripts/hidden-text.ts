let bound = false;

function toggle(target: HTMLElement): void {
  const span = target.closest<HTMLElement>('.a-md-hidden');
  if (!span) return;
  if (span.hasAttribute('data-revealed')) span.removeAttribute('data-revealed');
  else span.setAttribute('data-revealed', '');
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('a, button')) return;
  const span = target.closest<HTMLElement>('.a-md-hidden');
  if (span) toggle(span);
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const span = target.closest<HTMLElement>('.a-md-hidden');
  if (!span) return;
  event.preventDefault();
  toggle(span);
}

/** 移动端没有 hover：点击 / 键盘 Enter、Space 切换遮挡，桌面 hover 仍然有效。 */
export function initHiddenText(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
}
