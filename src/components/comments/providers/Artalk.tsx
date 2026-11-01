import Artalk from 'artalk';
import artalkStyles from 'artalk/Artalk.css?inline';
import { useEffect, useId, useRef } from 'react';
import type { CommentOptions } from '../Comments';

/**
 * Artalk 评论区。
 *
 * - Artalk 的 `darkMode` 只接受 `boolean | 'auto'`，不能像 Waline 那样传 CSS 选择器；
 *   初始化时读取 `html.dark`，并用 `MutationObserver` 跟随站点的主题切换。
 * - 样式用 `?inline` 跟随组件渲染，避免 ClientRouter 重建 `<head>` 后丢失。
 * - 服务端地址为空或请求失败时由 Artalk 自己处理，组件保持静默。
 */
export default function ArtalkComments({ options }: { options: CommentOptions }) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const { server, site, locale, pageSize } = options.artalk;

  useEffect(() => {
    if (!options.enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const isDark = () => document.documentElement.classList.contains('dark');
    container.innerHTML = '';

    let instance: Artalk | null = null;
    try {
      instance = Artalk.init({
        el: container,
        pageKey: window.location.pathname,
        pageTitle: document.title,
        server,
        site,
        locale,
        pagination: { pageSize },
        darkMode: isDark(),
      });
    } catch {
      // 静默失败：评论依赖远端服务，失败时保持空容器即可。
    }

    if (!instance) return;
    const active = instance;
    const observer = new MutationObserver(() => {
      active.setDarkMode(isDark());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    let destroyed = false;
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      active.destroy();
    };
    const onBeforeSwap = () => destroy();
    document.addEventListener('astro:before-swap', onBeforeSwap);

    return () => {
      document.removeEventListener('astro:before-swap', onBeforeSwap);
      destroy();
    };
  }, [options.enabled, server, site, locale, pageSize]);

  if (!options.enabled) return null;
  return (
    <div className="a-artalk" data-artalk-host>
      <style>{artalkStyles}</style>
      <div id={`a-comments-${id}`} ref={containerRef} />
    </div>
  );
}
