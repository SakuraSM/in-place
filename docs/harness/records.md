# Harness 维护记录

本文件记录稳定的工程决策、验证基线和待办，不替代 PR 描述，也不保存一次性日志、密钥或生产数据。

## 变更记录

| 日期 | 主题 | 行为影响 | 验证 | 后续 |
| --- | --- | --- | --- | --- |
| 2026-08-10 | 初始化 InPlace Harness 文档；沉淀 Web UI 与地图功能设计基线 | 仅文档，不改变产品行为 | 相对链接检查通过；地图投影 9/9、地图视图 9/9 测试通过；仓库命令、workflow 与代码入口已交叉检查 | 补统一 Quality workflow、文档链接检查和秘密扫描 |
| 2026-08-12 | Android/Web 能力对齐；新增共享地图投影、受限 WebView 桥接和家庭上下文 | Android 位置页增加位置树/地图双视图；主页面显示当前家庭；主导航顺序固定 | App Core/Web/Mobile 类型检查；桥接/投影测试；Web build；Android debug assemble；Pixel 8 API 35 视觉与无障碍树检查 | 在具备正常外部 DNS 的设备复验高德瓦片与逆地理编码 |
| 2026-08-12 | Android 页面背景与 Safe Area 复审 | 移除子页面边缘光晕；统一 PageHeader、刘海/状态栏安全区、标题密度和扫码页上下安全区 | Mobile lint/typecheck；17 项测试；Pixel 8 首页、分类、AI 配置、物品表单逐页截图检查 | 异形屏真机继续抽查系统字体放大与横屏 |

## 稳定决策

- Harness 文档只引用仓库真实存在的命令、目录边界和质量规则。
- 产品行为、交互口径和排障路径放 `docs/product`；工程流程和验证放 `docs/harness`。
- 客户端经 API 访问业务能力，PostgreSQL schema 与迁移归 `packages/db`。
- 地图安全密钥仅用于服务端代理，任何排障材料都必须脱敏。

## 待办

- [ ] 新增统一 PR Quality workflow，覆盖 Web/Server/Mobile lint、test、typecheck 和关键 build。
- [ ] 增加 Markdown 相对链接检查。
- [ ] 增加提交/CI 秘密扫描，并明确允许的示例占位符。
- [ ] 评估基于变更路径的最小验证脚本；在规则稳定前保持实现简单、透明。
