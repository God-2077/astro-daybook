/**
 * 本地 Twikoo 包没有随包发布类型声明；这里只声明项目实际用到的初始化接口。
 * 路径与 `package.json` 中固定的 `twikoo` 版本保持一致，升级版本时请复核。
 */
declare module 'twikoo/dist/twikoo.nocss.js' {
  export interface TwikooInitOptions {
    envId: string;
    el: HTMLElement;
    path?: string;
    lang?: string;
    region?: string;
  }

  export function init(options: TwikooInitOptions): Promise<void>;

  const twikoo: {
    init: typeof init;
  };

  export default twikoo;
}
