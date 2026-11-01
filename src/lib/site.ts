import { siteConfig } from '../config/site';

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
