# InPlace

InPlace 是一个家庭物品管理项目，目前采用小型 monorepo 结构组织代码。
仓库正在从“前端直连数据源”的原型形态，逐步迁移到以 PostgreSQL 为中心、带独立 API 层的工程化架构。

English version: [README.md](README.md)

## 项目简介

当前仓库主要由三部分组成：

- `apps/web`：基于 React + Vite 的前端应用
- `apps/server`：基于 Fastify 的服务端应用
- `packages/db`：共享的 PostgreSQL Schema、数据库连接与迁移配置

这种拆分方式的目标是把 UI、业务逻辑和持久化边界拆清楚，方便后续扩展、测试和协作开发。

## 功能特性

- 家庭物品管理 Web 应用
- 基于 Fastify 的服务端
- 使用 Drizzle ORM 管理 PostgreSQL Schema
- 基于 Docker 的本地 PostgreSQL 运行环境
- 基于 npm workspaces 的多包开发模式

## 架构说明

仓库正在从早期原型逐步迁移到更适合开源协作和长期维护的结构：

- 前端通过 API 访问业务能力
- API 负责参数校验、业务编排和数据库访问
- PostgreSQL 作为系统主数据源
- 数据库 Schema、迁移和本地基础设施全部纳入版本控制

更多架构说明见
[docs/architecture/target-architecture.md](docs/architecture/target-architecture.md)。

## 仓库结构

```text
.
├── apps
│   ├── server      # Fastify 服务端
│   └── web         # React + Vite 前端
├── packages
│   └── db          # Drizzle Schema 与数据库客户端
├── infra
│   └── postgres    # 本地 PostgreSQL 运行环境
├── docs
│   ├── architecture # 当前与目标架构文档
│   └── legacy       # 历史遗留资料归档
├── package.json
└── README.md
```

### 前端源码结构

`apps/web/src` 目前按明确分层组织：

- `app`：应用入口、Provider、顶层路由
- `features`：面向业务的功能模块与页面
- `widgets`：布局级拼装组件
- `shared`：可复用 UI 与通用工具
- `legacy`：迁移期保留的旧直连模块，仅用于兼容

新的前端数据访问逻辑不应继续放到 `legacy` 中。

## 环境要求

- Node.js `>= 20.10.0`
- npm `>= 10`
- Docker Desktop 或兼容的 Docker 运行时

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动本地 PostgreSQL

```bash
npm run db:up
```

### 3. 创建本地环境变量文件

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

### 4. 启动开发服务

分别在两个终端中执行：

```bash
npm run dev:server
```

```bash
npm run dev:web
```

## Docker Compose 部署

仓库现在已经包含完整的多服务部署文件：
[docker-compose.yml](docker-compose.yml)。

### 服务组成

- `postgres`：PostgreSQL 16
- `server`：Fastify 服务端容器
- `web`：Nginx 前端容器，同时把 `/api` 反向代理到 API 服务

### 单镜像部署

如果希望进一步简化自部署方式，仓库也提供了一套一体化部署文件：
[docker-compose.single.yml](docker-compose.single.yml)。

这个版本会把三个运行时组件打进同一个镜像：

- PostgreSQL
- Fastify API
- Nginx + 前端静态资源

它更适合单机、低运维成本的部署场景。如果你希望服务边界更清晰、
支持独立扩缩容，或分别管理生命周期，仍建议使用上面的拆分部署版本。

先准备环境变量：

```bash
cp .env.single.example .env.single
```

然后启动一体化容器：

```bash
docker compose --env-file .env.single -f docker-compose.single.yml up -d
```

浏览器访问：

```text
http://localhost:8080
```

这个 bundled 镜像会发布到 `ghcr.io/sakurasm/inplace-all-in-one:latest`。

### 准备部署环境

```bash
cp .env.compose.example .env.compose
```

首次部署前请先修改 `.env.compose`，至少配置这些值：

```env
POSTGRES_PASSWORD=<设置强密码>
JWT_SECRET=<至少32位随机字符串>
APP_ENCRYPTION_KEY=<至少32位随机字符串>
CORS_ORIGIN=https://your-domain.com,http://localhost:8080,http://127.0.0.1:8080
VITE_API_BASE_URL=/api
BACKUP_PAYLOAD_SIZE_MB=100
```

镜像会发布到 `ghcr.io/sakurasm/inplace-*`。

然后启动整套服务：

```bash
docker compose --env-file .env.compose up -d server web
```

在单机 Docker Compose 部署中，`server` 容器会在启动 API 之前自动执行
仓库中已纳入版本控制的数据库迁移，因此首次启动和后续更新都可以复用同一条命令。

如果希望把 PostgreSQL 数据放到外部文件系统，请在启动前额外设置
`POSTGRES_DATA_DIR` 为宿主机绝对路径，例如：

```env
POSTGRES_DATA_DIR=/Volumes/data/inplace/postgres
```

默认情况下，Compose 会把 PostgreSQL 数据保存在仓库内的 `./storage/postgres`。

浏览器访问：

```text
http://localhost:8080
```

### 验证部署状态

如需先显式拉取最新镜像：

```bash
docker compose --env-file .env.compose pull
```

查看容器状态：

```bash
docker compose --env-file .env.compose ps
```

持续查看日志：

```bash
docker compose --env-file .env.compose logs -f
```

通过 Web 入口检查 API 健康状态：

```text
http://localhost:8080/api/v1/health
```

### 停止或重建服务

停止整套服务：

```bash
docker compose --env-file .env.compose down
```

镜像更新或配置变更后重新启动：

```bash
docker compose --env-file .env.compose up -d server web
```

### 当前部署行为说明

由于业务层仍在从 legacy Supabase 访问路径迁移到 API + PostgreSQL 架构，
当前 Compose 部署默认采用“平台模式”保证整套系统可以直接验证：

- 如果没有提供 legacy Supabase 环境变量，前端会进入平台模式
- 平台模式会展示部署状态页
- Web 容器会通过 Compose 内部网络访问 API，并通过 `/api/v1/health` 校验 API 与 PostgreSQL 是否联通

这意味着即使库存功能还没有全部切换到新 API，整套前端 + API + 数据库部署链路仍然是可启动、可访问、可观测的。

## 环境变量

### API

参考 [apps/server/.env.example](apps/server/.env.example)。

主要变量：

- `PORT`：API 端口
- `DATABASE_URL`：PostgreSQL 连接串
- `CORS_ORIGIN`：本地开发允许的前端来源
- `POSTGRES_DATA_DIR`：Docker Compose 下 PostgreSQL 数据文件映射到宿主机的目录
- `JWT_SECRET`：JWT 签名密钥，至少 32 个字符
- `MAX_UPLOAD_SIZE_MB`：单张图片允许的最大上传大小
- `OPENAI_API_KEY`：服务端 AI 识别使用的 API Key
- `OPENAI_BASE_URL`：AI 服务基础地址，默认 `https://api.openai.com/v1`
- `OPENAI_MODEL`：AI 图片识别使用的模型名，默认 `gpt-4o`
- `APP_ENCRYPTION_KEY`：用于加密用户在个人中心保存的 AI Key，生产环境请使用独立的 32 位以上随机字符串

个人中心里的 AI 配置会加密保存在服务端数据库中，前端不会回显或透传明文 Key。当前账号自定义配置优先于系统默认配置。

### Web

参考 [apps/web/.env.example](apps/web/.env.example)。

主要变量：

- `VITE_API_BASE_URL`：API 基础地址

由于当前前端仍处于迁移阶段，示例文件中还保留了少量 legacy 变量，用于兼容尚未迁移完成的旧数据访问逻辑。

### 移动端

Android 和 iOS 应用位于 [apps/mobile](apps/mobile)，与 Web 共用同一套 API、domain 和 app-core 包。

主要变量：

- `EXPO_PUBLIC_API_BASE_URL`：用户在 App 内配置服务器前使用的默认 API 地址
- `EXPO_PROJECT_ID`：GitHub Actions 中用于 EAS Build 的仓库变量
- `EXPO_TOKEN`：GitHub Actions 中用于 EAS Build 的密钥

首次登录或注册时，在 App 内输入远程服务器地址和账号密码。App 会把地址规范化到 `/api`，在设备端保存服务器配置，并使用安全存储保存认证令牌。

### 图片上传

- 图片上传接口为 `POST /api/v1/uploads/images`
- 服务端将文件保存到 `./storage/uploads`，并通过 `/api/uploads/*` 对外提供访问
- 在 Docker Compose 部署中，上传文件会持久化在 `inplace_uploads_data` 卷中

## 常用脚本

在仓库根目录执行：

```bash
npm run dev:web
npm run dev:server
npm run build
npm run lint
npm run typecheck
npm run dev:mobile
npm run android
npm run ios
npm run build:mobile:android
npm run build:mobile:ios
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

数据库层使用 Drizzle ORM。

生成迁移：

```bash
npm run db:generate
```

执行迁移：

```bash
npm run db:migrate
```

本地 PostgreSQL 配置位于
[infra/postgres/docker-compose.yml](infra/postgres/docker-compose.yml)。

已纳入版本控制的 SQL 迁移位于
[packages/db/migrations](packages/db/migrations)，
运行时迁移执行器位于
[packages/db/scripts/migrate.ts](packages/db/scripts/migrate.ts)。

## 当前状态

当前仓库已经完成这些结构性迁移：

- workspaces 改造
- 独立 API 包
- 独立数据库包
- 本地 PostgreSQL 运行环境

仍在进行中的部分：

- `apps/web` 已进入正确的工作区结构
- 前端部分模块仍保留旧的直连数据访问逻辑
- 这些模块后续需要逐步替换为 API 调用
- Docker Compose 已覆盖完整平台链路：前端、服务端和 PostgreSQL，数据库结构迁移会在服务启动时自动执行
- Compose 下的前端默认运行在平台模式，直到 legacy 业务链路完全退场

旧的 Supabase SQL 迁移文件目前保留在
[docs/legacy/supabase](docs/legacy/supabase)，仅作为历史参考。

## 贡献说明

在更完整的贡献规范完善前，默认遵循以下原则：

1. 不要把持久化逻辑继续堆到前端里。
2. 新增数据库结构时，优先通过 `packages/db` 管理。
3. 新功能优先走 API，而不是前端直接访问数据库。
4. 提交前至少执行 `npm run typecheck` 和 `npm run build`。

更多见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 路线图

- 将剩余 legacy 前端数据访问替换为 API 客户端
- 在 `apps/server` 中补齐领域服务与仓储边界
- 为 API 和数据库流程补充自动化测试
- 完善贡献、发布和版本维护文档

## 许可证

本项目基于 Apache License 2.0 发布，详见 [LICENSE](LICENSE)。
