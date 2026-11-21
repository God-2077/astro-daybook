import type { ComponentType, ReactNode } from 'react';
import { Component, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { CommentsConfig } from '../../types/config';

/**
 * 评论组件的运行期选项，由 `src/lib/comments.ts` 的 `commentOptions()` 生成。
 *
 * 直接复用解析后的 `CommentsConfig`，三个 provider 的配置随选项一起传入，
 * 组件本身只按 `provider` 选择实现，不再单独维护一份 props 类型。
 */
export type CommentOptions = CommentsConfig;

export interface ProviderProps {
  options: CommentOptions;
  /** 评论系统完成首次 DOM 注入后调用；调用前评论区继续显示骨架。 */
  onReady?: () => void;
}

/**
 * provider 映射表。
 *
 * 用 `React.lazy` 按需加载：只有被选中的评论系统才会下载对应 SDK 与厂商 CSS，
 * 未选中的 provider 不会进入首屏 chunk。`CommentsSection.astro` 与
 * `LockedContent.tsx` 都是通过本组件进入评论区，所以路由集中在这里。
 */
const providers: Record<string, ComponentType<ProviderProps>> = {
  twikoo: lazy(() => import('./providers/Twikoo')),
  waline: lazy(() => import('./providers/Waline')),
  artalk: lazy(() => import('./providers/Artalk')),
};

interface CommentErrorBoundaryState {
  failed: boolean;
}

/**
 * 评论 chunk 加载失败时静默隐藏评论区。
 *
 * 评论依赖远端服务与第三方 SDK，失败不应影响正文阅读；这里只记录一条
 * `console.warn`，不渲染错误卡片，也不引入新的文案。
 */
class CommentErrorBoundary extends Component<{ children: ReactNode }, CommentErrorBoundaryState> {
  state: CommentErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): CommentErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[daybook:comments] 评论组件加载失败：', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function CommentSkeleton() {
  return (
    <div className="a-comments-skeleton" aria-hidden="true">
      <div className="a-comments-skeleton-composer">
        <span className="a-comments-skeleton-input" />
        <span className="a-comments-skeleton-button" />
      </div>
      {[0, 1].map((row) => (
        <div className="a-comments-skeleton-row" key={row}>
          <span className="a-comments-skeleton-avatar" />
          <div className="a-comments-skeleton-body">
            <span className="a-comments-skeleton-meta" />
            <span className="a-comments-skeleton-line" />
            <span className="a-comments-skeleton-line a-comments-skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 评论区入口。
 *
 * - `mounted` 门控保证服务端与首次客户端渲染都不 import 依赖 DOM 的 SDK，
 *   避免 SSR 报错与 hydration mismatch。
 * - 外层常驻 `.a-comments-mount`：`client:visible` 观察的是 island 的子元素，
 *   水合前与 provider chunk 加载中渲染骨架屏，既给出加载反馈，也保证有可观察目标。
 * - 骨架由 `ready` 控制而不是 Suspense fallback：lazy chunk 到达时 provider 还只有
 *   空宿主，SDK 的 DOM 要等 `useEffect` 注入；提前卸载骨架会让评论区高度归零再弹开。
 *   provider 完成首次渲染后调用 `onReady`，骨架才让位给真实内容。
 * - provider 不在白名单时返回 `null`；配置层已经输出过 warn。
 * - 站内跳转时 island 重建，各 provider 在 `useEffect` 清理函数里销毁实例。
 */
export default function Comments({ options }: { options: CommentOptions }) {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!options.enabled) return null;

  const Provider = providers[options.provider];
  if (!Provider) return null;

  return (
    <CommentErrorBoundary>
      <div className="a-comments-mount" data-comments-mount aria-busy={!ready}>
        {!ready && <CommentSkeleton />}
        {mounted && (
          <Suspense fallback={null}>
            <Provider options={options} onReady={handleReady} />
          </Suspense>
        )}
      </div>
    </CommentErrorBoundary>
  );
}
