// MDX 与页面共用的 UI 具名出口：import { Timeline, TimelineItem } from '@ui'
// 只导出通用、稳定的展示组件；按需追加，避免把整组组件拉进每个引用方的模块图。

export { default as Figure } from './content/Figure.astro';
export { default as MusicPlayer } from './content/MusicPlayer.astro';
export { default as Timeline } from './content/Timeline.astro';
export { default as TimelineItem } from './content/TimelineItem.astro';
