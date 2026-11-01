import { siteConfig } from '../config/site';

const SITE_HOST = new URL(siteConfig.url).host;

/**
 * 判断链接是否指向站外。
 *
 * 只比较 host：同 host 的绝对地址（`http` / `https` 互换、大小写差异）仍算站内链接；
 * 锚点、`/` 开头的站内路径、相对路径与 `mailto:` / `tel:` 都不算外链。
 */
export function isExternalUrl(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return new URL(href).host !== SITE_HOST;
  } catch {
    return false;
  }
}

export function absoluteUrl(pathname: string): string {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return new URL(pathname, `${siteConfig.url}/`).href;
}

export function sitePath(pathname: string): string {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export function canonicalPath(pathname: string): string {
  const normalized = sitePath(pathname).replace(/\/{2,}/g, '/');
  return normalized !== '/' ? normalized.replace(/\/$/, '') : '/';
}

export function pageTitle(title?: string): string {
  return title ? `${title} · ${siteConfig.title}` : siteConfig.title;
}

export function withBase(pathname: string): string {
  return pathname;
}
