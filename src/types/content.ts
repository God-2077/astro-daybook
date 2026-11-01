export type ContentCollection = 'daily' | 'post';

export type ContentFormat = 'md' | 'mdx';

export type HideFrom = 'home' | 'rss' | 'archive' | 'search' | 'tag' | 'category' | 'sitemap';

export interface ContentDataBase {
  title: string;
  date: Date;
  updated?: Date;
  description?: string;
  slug: string;
  permalink?: string;
  draft: boolean;
  pin: boolean;
  password?: string;
  hideFrom: HideFrom[];
  comments: boolean;
}

export interface DailyData extends ContentDataBase {
  /** 日记展示用标签；不进入文章分类体系。 */
  category?: string;
  /** 为 true 时该篇在首页条目不显示标题；详情/归档/RSS 不受影响。 */
  hideHomeTitle: boolean;
}

export interface PostData extends ContentDataBase {
  categories: string[];
  tags: string[];
  keywords: string[];
}

export type AnyContentData = DailyData | PostData;

export interface ContentEntry<T extends AnyContentData = AnyContentData> {
  collection: ContentCollection;
  id: string;
  filePath: string;
  body: string;
  format: ContentFormat;
  slug: string;
  url: string;
  data: T;
}

export type DailyEntry = ContentEntry<DailyData> & { collection: 'daily' };
export type PostEntry = ContentEntry<PostData> & { collection: 'post' };
export type AnyEntry = DailyEntry | PostEntry;
