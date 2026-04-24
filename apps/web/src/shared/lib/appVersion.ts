// 应用版本号：在构建期由 Vite 通过 `define` 注入（来源为根 package.json 或环境变量 INPLACE_VERSION）。
// 详见 apps/web/vite.config.ts 中的 resolveAppVersion 实现，
// 以及 .github/workflows/release.yml 中发版时对 package.json 版本号的自动更新。
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '0.0.0';
