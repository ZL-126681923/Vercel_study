/**
 * 共享 Matter.js 加载器
 *
 * 解决问题：
 * 1. 原实现用 cdnjs.cloudflare.com，国内访问慢/被墙
 * 2. 原实现 script.onload = initGame 在 React 18 Strict Mode 双挂载下，
 *    cleanup 把 onload 清空，导致脚本加载完后回调不再触发
 *
 * 方案：
 * - 改用 Staticfile CDN（国内可访问）
 * - 用全局 Promise + addEventListener，监听器不会被 cleanup 清空
 * - 多次 mount 复用同一个 Promise，避免重复插入 script
 */

declare global {
  interface Window {
    Matter: any;
    __matterReady?: Promise<any>;
  }
}

const MATTER_SRC = 'https://cdn.staticfile.org/matter-js/0.19.0/matter.min.js';

export function loadMatter(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadMatter: SSR'));
  }
  if (window.Matter) {
    return Promise.resolve(window.Matter);
  }
  if (window.__matterReady) {
    return window.__matterReady;
  }

  window.__matterReady = new Promise((resolve, reject) => {
    // 复用已存在的 script 标签
    let script = document.querySelector<HTMLScriptElement>(
      `script[data-matter-loader]`
    );
    if (!script) {
      script = document.createElement('script');
      script.src = MATTER_SRC;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.matterLoader = '1';
      document.head.appendChild(script);
    }

    const onLoad = () => {
      if (window.Matter) resolve(window.Matter);
      else reject(new Error('Matter.js loaded but window.Matter is undefined'));
    };
    // 用 addEventListener 而非 onload 属性，避免被外部赋 null 清掉
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Matter.js script load error')),
      { once: true }
    );

    // 15s 超时兜底，避免 Promise 永久挂起
    setTimeout(() => {
      if (!window.Matter) reject(new Error('Matter.js load timeout'));
    }, 15000);
  });

  return window.__matterReady;
}