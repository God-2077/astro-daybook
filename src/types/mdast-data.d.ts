import type { ElementContent, Properties } from 'hast';

// mdast-util-to-hast 读取这几个字段，但 @types/mdast 没有把它们放进 Data；
// 在项目内补一次声明，避免每个指令输出都写类型断言。
declare module 'mdast' {
  interface Data {
    hName?: string;
    hProperties?: Properties;
    hChildren?: ElementContent[];
  }
}
