# 归位全页面视觉稿 v1

设计日期：2026-10-27。代码基线：`d108fda`。风格：清新、简约、暖白与青绿。

本文件描述原始视觉稿交付。运行时 UI 改造另见[落地记录](implementation.md)，不将这里的静态稿截图作为应用验收证据。

这是供评审和后续开发使用的静态设计交付。预览使用虚构家庭与库存数据，不调用业务 API；运行时实现与验收独立记录。

## 浏览视觉稿

从仓库根目录启动预览：

```sh
node node_modules/vite/bin/vite.js docs/design/fresh-minimal-v1 --host 127.0.0.1 --port 4173 --strictPort
```

打开 `http://127.0.0.1:4173/`。总览支持按模块和页面名称筛选；每个条目分别提供 Web、移动端和 PNG 入口。需要先在仓库根目录安装现有 npm 依赖；没有新增第三方依赖。

- [设计总览源文件](index.html)
- [单页视觉稿查看器](preview.html?page=home&platform=web)
- [全局设计规范](design-system.md)
- [页面设计说明与交互边界](page-specs.md)
- [页面覆盖清单](coverage.md)
- [机器可读设计 tokens](tokens.json)
- [逐页浏览器检查记录](validation.json)
- [验证说明](verification.md)
- [变更范围](impact-map.md)

## 交付范围

共 35 个页面与设计板，包括 33 个页面或页面状态、1 个组件板和 1 个反馈状态板。按实际端能力导出 32 张 Web 稿与 34 张移动稿，共 66 张完整页面 PNG。另有首页 / 库存首屏与交付总览图。

移动稿以 390 × 844 为首屏基准，Web 稿以 1440 × 1024 为首屏基准。长页面导出完整内容，PNG 高度可超过首屏基准。全页导出时底部导航移至稿件末尾，交互预览仍固定在视口底部。

移动稿是用浏览器排版生成的原生端视觉规格，不能作为 Expo 真机、模拟器或系统控件的运行证据。Web 稿同样不表示现有 React 页面已完成改造。

## 持久化与维护

所有交付文件位于本目录，可直接纳入 Git。PNG 使用真实浏览器渲染，HTML / CSS / JS 为可编辑源稿。预览不使用 CDN、远程字体或外部图片。

修改规则：

1. 在 `source/tokens.css` 修改设计 tokens。该文件是本套视觉稿的 token 来源。
2. 在 `source/primitives.js` 修改共享展示组件，在 `source/layouts.css` 修改端布局。
3. 在 `source/catalog.js` 维护路由与设计板清单。页面内容按库存、工具、账户拆分。
4. 执行下方验证与导出，再一并提交源稿、规范和 PNG。
5. 待设计通过评审后，再以独立实现任务迁移到 `packages/ui` 和双端组件。

本目录 tokens 用于视觉稿，应用从 `packages/ui/src/tokens` 读取运行时 tokens。双端迁移保留已有导出名与平台适配器，具体状态见落地记录。

## 重新生成

```sh
# 导出已有 Lucide 图标和示例二维码，无网络请求
node docs/design/fresh-minimal-v1/source/build-assets.mjs

# 导出覆盖清单与 tokens，检查源码、路由和图片文件
node docs/design/fresh-minimal-v1/source/validate.mjs
```

浏览器 PNG 导出通过 Ego Lite 执行。先读取 `ego-browser skill`，创建本次专用 TaskSpace，把 `source/capture.mjs` 中 `SPACE_ID` 改为返回值，再运行：

```sh
ego-browser nodejs -e 'await import("file:///ABSOLUTE_PATH/docs/design/fresh-minimal-v1/source/capture.mjs")'
```

需要已启动上述预览服务。导出脚本复用同一个页面，检查所有图片和横向溢出，并将结果写入 `validation.json`。TaskSpace 是本机浏览器会话，不应把示例 ID 当作跨机器通用配置。

## 资源来源

- `assets/logo.png`：复制自 `apps/web/public/branding/inplace-logo-mark.png`，保留现有品牌标志。
- 分类插画：复制自 `packages/ui/src/assets/category-presets/*.webp`，保留现有插画语言。
- `assets/icons/`：由仓库现有 `lucide-react` 导出，遵循 Lucide 的 ISC 许可证，见 [资源说明](assets/NOTICE.md)。
- `assets/map-reference.jpg`：复制自 `docs/assets/inplace-asset-map.jpg`。仅裁取已有底图区域作为布局参考；不是实时地图或新地图样式验收证据。
- `assets/label-qr.svg`：由仓库现有 `qrcode` 生成，编码为 `https://example.invalid/visual-label`，不绑定真实物品。

未使用图像生成工具。所有图片为仓库已有资源，所有页面文字和布局由本目录源码确定性渲染，便于修订和版本比较。
