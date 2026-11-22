/**
 * 独立页面的 URL 是集合 id（相对 pages 集合根目录的文件名，含子目录）。
 *
 * 不把 index 重写为父路径：pages/notes/index.mdx 对应 /notes/index。
 */
export function pageUrl(id: string): string {
  return `/${id.replace(/^\/+|\/+$/g, '')}`;
}
