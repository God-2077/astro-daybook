import { useEffect, useId, useRef } from 'react';
import twikooStyles from 'twikoo/dist/twikoo.css?inline';
import type { CommentOptions } from '../Comments';

interface TwikooApi {
  init: (options: { envId: string; el: HTMLElement; path?: string; lang?: string; region?: string }) => Promise<void>;
}

/**
 * 按需加载本地安装的 Twikoo（`twikoo.nocss.js`，不注入样式）。
 *
 * 使用 `nocss` 构建，样式由组件内联的 `twikoo.css` 提供：
 * CDN 版 Twikoo 会在首次加载时把样式 `<style>` 插进 `<head>`，而 ClientRouter
 * 站内跳转会重建 `<head>`，导致后续页面的评论区丢失样式。把样式跟随组件一起
 * 渲染，评论岛每次挂载都会带回完整样式。
 *
 * 模块级缓存保证整站只加载一次；失败时清空缓存，下次挂载可以重试。
 */
let twikooLoader: Promise<TwikooApi> | null = null;

function loadTwikoo(): Promise<TwikooApi> {
  if (twikooLoader) return twikooLoader;

  const loader = import('twikoo/dist/twikoo.nocss.js')
    .then((imported) => {
      // UMD 包在 Vite 开发模式与 Rollup 构建下的导出形态不同，这里同时兼容
      // `{ default: { init } }` 与顶层 `{ init }` 两种结果。
      const namespace = imported as unknown as { init?: TwikooApi['init']; default?: TwikooApi };
      const api = typeof namespace.init === 'function' ? (namespace as TwikooApi) : namespace.default;
      if (!api || typeof api.init !== 'function') {
        throw new Error('twikoo init unavailable');
      }
      return api;
    })
    .catch((error: unknown) => {
      twikooLoader = null;
      throw error;
    });

  twikooLoader = loader;
  return loader;
}

/**
 * Twikoo 评论区。
 *
 * - `options.enabled` 为 `true` 时始终渲染 `.a-twikoo` 容器并加载本地 Twikoo 初始化。
 * - 不检查 `envId` 是否为空：是否具备可用的 Twikoo 环境由 Twikoo 自己判断并提示，
 *   组件只负责把配置原样传入。
 * - 加载/初始化失败时静默保持空容器，不影响页面其余部分。
 */
export default function Twikoo({ options }: { options: CommentOptions }) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const { envId, region, lang } = options.twikoo;

  useEffect(() => {
    if (!options.enabled) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    // 站内跳转 / HMR 后可能复用同一个容器，先清空避免重复挂载。
    container.innerHTML = '';

    const init = async () => {
      try {
        const twikoo = await loadTwikoo();
        if (cancelled) return;
        await twikoo.init({
          envId,
          el: container,
          path: window.location.pathname,
          lang: lang || 'zh-CN',
          ...(region ? { region } : {}),
        });
      } catch {
        // 静默失败：评论依赖远端服务，失败时保持空容器即可。
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [options.enabled, envId, lang, region]);

  if (!options.enabled) return null;
  return (
    <div className="a-twikoo" data-twikoo>
      <style>{twikooStyles}</style>
      <div id={`a-comments-${id}`} ref={containerRef} />
    </div>
  );
}
