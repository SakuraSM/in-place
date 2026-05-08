# InPlace

[English version](README.md)

InPlace 是一个开源的家庭物品管理项目，用于记录家中有哪些物品、放在哪里、如何分类和追踪变更。项目采用 TypeScript monorepo 组织，包含 React Web 应用、Expo 移动端应用、Fastify API 和 PostgreSQL 数据层。

代码仍在持续演进，但当前方向已经明确：客户端通过 API 访问业务能力，API 负责校验和持久化访问，PostgreSQL 作为系统主数据源。

## 功能特性

- 物品、分类、位置、标签和操作记录管理。
- 基于 React、Vite 和共享领域包的 Web 客户端。
- 基于 Expo 和 React Native 的移动端客户端。
- 基于 Fastify 的 API 服务，使用 PostgreSQL 和 Drizzle ORM。
- 支持图片上传，并预留服务端 AI 识别能力。
- 支持 JSON、CSV 导出，移动端支持 JSON 备份导入。
- 支持拆分服务和一体化两种 Docker Compose 部署方式。

## 仓库结构

```text
.
├── apps
│   ├── mobile      # Expo / React Native 应用
│   ├── server      # Fastify API
│   └── web         # React + Vite Web 应用
├── packages
│   ├── api-client  # 共享 API 客户端辅助能力
│   ├── app-core    # 跨客户端应用逻辑
│   ├── db          # Drizzle schema、数据库客户端和迁移
│   ├── domain      # 共享领域类型和规则
│   └── ui          # 共享设计 token 和 UI 基础能力
├── docs            # 架构说明与历史资料
├── infra           # 本地基础设施，包括 PostgreSQL
├── docker-compose.yml
├── docker-compose.single.yml
└── package.json
```

## 架构说明

InPlace 按清晰的职责边界组织：

- `apps/web` 和 `apps/mobile` 负责用户界面。
- `apps/server` 暴露 API 路由，负责输入校验、业务编排和持久化访问。
- `packages/db` 维护 PostgreSQL schema 和迁移工具。
- `packages/domain`、`packages/app-core`、`packages/api-client`、`packages/ui` 在多个客户端之间复用领域、应用和 UI 能力。

新的数据访问逻辑应优先通过 API 实现，不应继续在前端客户端中新增直接数据库访问或 legacy 数据源访问。

更多背景见 [docs/architecture/target-architecture.md](docs/architecture/target-architecture.md)。

## 环境要求

- Node.js `>= 20.10.0`
- npm `>= 10`
- Docker Desktop 或兼容的 Docker 运行时
- 开发移动端时需要 Expo 相关工具链

## 快速开始

安装依赖：

```bash
npm install
```

启动本地 PostgreSQL：

```bash
npm run db:up
```

创建本地环境变量文件：

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

分别在两个终端中启动 API 和 Web：

```bash
npm run dev:server
```

```bash
npm run dev:web
```

启动移动端：

```bash
npm run dev:mobile
```

如需运行原生移动端构建：

```bash
npm run android
npm run ios
```

## 部署

仓库支持两种 Docker Compose 部署方式。

### 拆分服务部署

[docker-compose.yml](docker-compose.yml) 会以独立服务运行 PostgreSQL、Fastify API 和 Web 前端。希望服务边界清晰、方便独立管理生命周期时，建议使用这种方式。

准备环境变量：

```bash
cp .env.compose.example .env.compose
```

首次启动前至少需要修改这些值：

```env
POSTGRES_PASSWORD=<设置强密码>
JWT_SECRET=<至少32位随机字符串>
APP_ENCRYPTION_KEY=<至少32位随机字符串>
CORS_ORIGIN=https://your-domain.com,http://localhost:8080,http://127.0.0.1:8080
VITE_API_BASE_URL=/api
BACKUP_PAYLOAD_SIZE_MB=100
```

启动服务：

```bash
docker compose --env-file .env.compose up -d server web
```

浏览器访问：

```text
http://localhost:8080
```

`server` 容器会在 API 启动前自动执行已纳入版本控制的数据库迁移，因此首次启动和后续更新都可以复用同一条命令。

### 一体化部署

[docker-compose.single.yml](docker-compose.single.yml) 会把 PostgreSQL、API 和 Nginx 托管的前端静态资源打包进一个容器，适合简单的单机自部署场景。

准备环境变量：

```bash
cp .env.single.example .env.single
```

启动一体化容器：

```bash
docker compose --env-file .env.single -f docker-compose.single.yml up -d
```

一体化镜像发布地址：

```text
ghcr.io/sakurasm/inplace-all-in-one:latest
```

## 部署运维

拉取镜像：

```bash
docker compose --env-file .env.compose pull
```

查看容器状态：

```bash
docker compose --env-file .env.compose ps
```

查看日志：

```bash
docker compose --env-file .env.compose logs -f
```

通过 Web 入口检查 API 健康状态：

```text
http://localhost:8080/api/v1/health
```

停止拆分服务部署：

```bash
docker compose --env-file .env.compose down
```

如果希望把 PostgreSQL 数据放到指定宿主机路径，请在启动 Compose 前设置 `POSTGRES_DATA_DIR`：

```env
POSTGRES_DATA_DIR=/Volumes/data/inplace/postgres
```

默认情况下，Compose 会把 PostgreSQL 数据保存到 `./storage/postgres`。

## 环境变量

### API

参考 [apps/server/.env.example](apps/server/.env.example)。

主要变量：

- `PORT`：API 端口。
- `DATABASE_URL`：PostgreSQL 连接串。
- `CORS_ORIGIN`：允许访问 API 的前端来源。
- `JWT_SECRET`：JWT 签名密钥，建议使用至少 32 位随机字符串。
- `APP_ENCRYPTION_KEY`：用户保存的 AI 凭据加密密钥，生产环境请使用独立密钥。
- `MAX_UPLOAD_SIZE_MB`：单张图片最大上传大小。
- `BACKUP_PAYLOAD_SIZE_MB`：备份导入最大请求体大小。
- `OPENAI_API_KEY`：服务端 AI 识别使用的可选默认 API Key。
- `OPENAI_BASE_URL`：AI 服务基础地址，默认 `https://api.openai.com/v1`。
- `OPENAI_MODEL`：AI 图片识别使用的模型名。

个人中心保存的 AI 配置会在服务端加密保存。前端不会回显明文 Key，账号级配置优先于系统默认配置。

### Web

参考 [apps/web/.env.example](apps/web/.env.example)。

主要变量：

- `VITE_API_BASE_URL`：API 基础地址。

在旧数据访问路径完全退场前，前端示例文件中可能仍保留少量 legacy 迁移变量。

### 移动端

移动端应用位于 [apps/mobile](apps/mobile)，与 Web 共用同一套 API、domain 和 app-core 包。

主要变量：

- `EXPO_PUBLIC_API_BASE_URL`：用户在 App 内配置服务器前使用的默认 API 地址。
- `EXPO_PROJECT_ID`：GitHub Actions 中用于 EAS Build 的仓库变量。
- `EXPO_TOKEN`：GitHub Actions 中用于 EAS Build 的密钥。

首次登录或注册时，在 App 内输入服务器地址和账号密码。App 会把服务器地址规范化到 `/api`，在设备端保存服务器配置，并使用安全存储保存认证令牌。

## 开发脚本

在仓库根目录执行：

```bash
npm run dev:web
npm run dev:server
npm run dev:mobile
npm run android
npm run ios
npm run build
npm run build:web
npm run build:server
npm run build:mobile
npm run lint
npm run typecheck
npm run db:up
npm run db:down
npm run db:logs
npm run db:generate
npm run db:migrate
npm run compose:pull
npm run compose:up
npm run compose:down
npm run compose:logs
npm run single:pull
npm run single:up
npm run single:down
npm run single:logs
```

## 数据库开发

生成迁移：

```bash
npm run db:generate
```

执行迁移：

```bash
npm run db:migrate
```

本地 PostgreSQL 配置位于 [infra/postgres/docker-compose.yml](infra/postgres/docker-compose.yml)。已纳入版本控制的 SQL 迁移位于 [packages/db/migrations](packages/db/migrations)，运行时迁移执行器位于 [packages/db/scripts/migrate.ts](packages/db/scripts/migrate.ts)。

## 当前状态

项目已经完成 workspaces、独立 API、共享数据库包和本地 PostgreSQL 运行环境等结构性迁移。迁移期间仍可能存在少量 legacy 前端数据访问路径；新功能应优先采用 API-backed 流程。

旧的 Supabase SQL 资料仅作为历史参考保留在 [docs/legacy/supabase](docs/legacy/supabase)。

## 参与贡献

欢迎参与贡献。提交 PR 前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并遵循项目的 [Code of Conduct](CODE_OF_CONDUCT.md)。

提交前请运行：

```bash
npm run typecheck
npm run build
```

如果改动只影响某个 app 或 package，也建议同时运行对应 workspace 的检查脚本。

请不要提交密钥、生产凭据或本地环境变量文件。仓库中的 `.env*.example` 文件仅作为配置模板使用。

## 路线图

- 将剩余 legacy 前端数据访问替换为 API 客户端。
- 强化服务端领域服务与仓储边界。
- 为 API、数据库、Web 和移动端流程补充自动化测试。
- 完善发布和自部署文档。

## 许可证

本项目基于 Apache License 2.0 发布，详见 [LICENSE](LICENSE)。
