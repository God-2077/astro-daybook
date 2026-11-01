import { init, type WalineInstance } from '@waline/client';
import walineStyles from '@waline/client/style?inline';
import { useEffect, useId, useRef } from 'react';
import type { CommentOptions } from '../Comments';

/**
 * Waline 评论区。
 *
 * - `dark: 'html.dark'` 会向 `<head>` 注入 `html.dark{--waline-…}`，站点切换主题时
 *   只需切换 `html` 的 `dark` class，Waline 的深色变量自动生效。
 * - 样式用 `?inline` 跟随组件渲染：ClientRouter 站内跳转会重建 `<head>`，
 *   运行时插入的 `<style>` 会丢失，内联可以保证每次挂载都带上完整样式。
 * - 服务端地址为空或请求失败时由 Waline 自己处理，组件保持静默。
 */
export default function Waline({ options }: { options: CommentOptions }) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const { serverURL, lang, login, pageSize } = options.waline;

  useEffect(() => {
    if (!options.enabled) return;
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    let instance: WalineInstance | null = null;
    try {
      instance = init({
        el: container,
        path: window.location.pathname,
        serverURL,
        lang,
        login,
        pageSize,
        dark: 'html.dark',
      });
    } catch {
      // 静默失败：评论依赖远端服务，失败时保持空容器即可。
    }

    let destroyed = false;
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      instance?.destroy();
    };
    const onBeforeSwap = () => destroy();
    document.addEventListener('astro:before-swap', onBeforeSwap);

    return () => {
      document.removeEventListener('astro:before-swap', onBeforeSwap);
      destroy();
    };
  }, [options.enabled, serverURL, lang, login, pageSize]);

  if (!options.enabled) return null;
  return (
    <div className="a-waline" data-waline-host>
      <style>{walineStyles}</style>
      <div id={`a-comments-${id}`} ref={containerRef} />
    </div>
  );
}
