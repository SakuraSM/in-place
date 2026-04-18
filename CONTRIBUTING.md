# Contributing

感谢你关注 InPlace。这个仓库目前聚焦在可本地运行、可开源协作的核心闭环：Web、API 和 PostgreSQL。

## 开发原则

1. Web 端优先通过共享 API 客户端访问服务端能力。
2. API 负责校验、编排、认证和持久化边界。
3. 数据库结构统一放在 `packages/db` 中维护。
4. 本地开发流程应尽量保持简单、可复现、可文档化。

## 本地开发

安装依赖：

```bash
npm install
```

启动本地数据库：

```bash
npm run db:up
```

执行数据库迁移：

```bash
npm run db:migrate
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

请在提交前至少运行：

```bash
npm run typecheck
npm run build
```

如果你的改动涉及数据库结构，请补充或更新对应的 Drizzle schema 与迁移流程。

## 提交建议

- 提交应聚焦单一目的
- 不要顺手混入无关重构
- 如果是架构性改动，请在 PR 或提交说明中写清楚动机和影响范围

## 目录边界

- `apps/web`：页面、组件、前端状态、API 客户端
- `apps/server`：路由、校验、服务编排
- `packages/db`：schema、数据库客户端、迁移配置
- `infra/postgres`：本地 PostgreSQL 运行定义

## 沟通

如果你准备做较大改动，建议先说明：

- 要解决什么问题
- 会改动哪些目录
- 是否涉及数据库结构调整或环境变量变化

这样可以减少返工，也更方便后续协作。
