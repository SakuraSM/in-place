# Contributing

感谢你关注 InPlace。

当前仓库仍处于架构迁移阶段，因此提交改动时请优先保证边界清晰，而不是只追求功能快速堆叠。

## 开发原则

1. 前端不应继续引入新的直接数据库访问逻辑。
2. API 负责校验、编排和业务边界。
3. 数据库结构统一放在 `packages/db` 中维护。
4. 基础设施和本地运行方式应保持可复现。

## 本地开发

安装依赖：

```bash
npm install
```

启动本地数据库：

```bash
npm run db:up
```

启动 API：

```bash
npm run dev:server
```

启动 Web：

```bash
npm run dev:web
```

## 提交前检查

先按 [变更协议](docs/harness/change-protocol.md) 写清影响范围，再从[测试策略](docs/harness/testing-guide.md)选择触达范围的验证。跨 workspace 改动请至少运行：

```bash
npm run lint
npm run typecheck
npm run build
```

涉及 Web、Server 或 Mobile 行为时，还应执行对应 workspace 的测试；没有运行的验证需要在 PR 中写明原因。

如果你的改动涉及数据库结构，请补充或更新对应的 Drizzle 配置与迁移流程。

## 提交建议

- 提交应聚焦单一目的
- 不要顺手混入无关重构
- 如果是架构性改动，请在 PR 或提交说明中写清楚迁移动机和影响范围
- 分支不使用 `codex/` 前缀；没有既定命名时使用 `<type>/<short-kebab-summary>`
- Commit Message 建议遵循 [Harness 约定](docs/harness/commit-message.md)

## 目录边界

- `apps/web`：页面、组件、前端状态、API 客户端
- `apps/server`：路由、校验、服务编排
- `packages/db`：Schema、数据库客户端、迁移配置
- `infra`：本地运行基础设施

## 沟通

如果你准备做较大改动，建议先说明：

- 要解决什么问题
- 会改动哪些目录
- 是否涉及数据库结构调整

这样可以减少返工，也更方便后续协作。

完整的工程流程、质量规则、门禁现状、任务路由和 PR 模板见 [Harness 文档入口](docs/harness/README.md)。
