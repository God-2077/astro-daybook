/**
 * 本地 Twikoo 包没有随包发布类型声明；这里只声明项目实际用到的初始化接口。
 * 主入口与 `package.json` 中固定的 `twikoo` 版本保持一致，升级版本时请复核。
 */
declare module 'twikoo' {
  export interface TwikooInitOptions {
    envId: string;
    el: HTMLElement;
    path?: string;
    lang?: string;
    region?: string;
    /** 非内置语言分片的基址；2.x 会从这里按需加载 `locales/<lang>.js`。 */
    localeBaseUrl?: string;
  }

  export function init(options: TwikooInitOptions): Promise<void>;

  const twikoo: {
    init: typeof init;
  };

  export default twikoo;
}
