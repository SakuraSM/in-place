# InPlace

InPlace 是一个家庭物品管理项目，采用小型 npm workspaces monorepo 组织代码。
这个拆分后的仓库只保留适合开源协作的核心部分：Web、Fastify API、共享 TypeScript 包和 PostgreSQL schema 工具链。

English version: [README.md](README.md)

## 当前包含的内容

- `apps/web`：基于 React + Vite 的前端应用
- `apps/server`：基于 Fastify 的服务端应用
- `packages/db`：Drizzle schema、数据库客户端与迁移脚本
- `packages/api-client`：共享 API 客户端工具
- `packages/app-core`：共享应用侧 API 封装
- `packages/domain`：共享领域类型
- `infra/postgres`：本地开发用 PostgreSQL 运行定义

## 环境要求

- Node.js `>= 20.10.0`
- npm `>= 10`
- Docker Desktop 或兼容的 Docker 运行时

## 快速开始

1. 安装依赖：

   ```bash
   npm install
   ```

2. 创建本地环境变量文件：

   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. 启动 PostgreSQL：

   ```bash
   export POSTGRES_PASSWORD=<设置强密码>
   npm run db:up
   ```

4. 执行数据库迁移：

   ```bash
   npm run db:migrate
   ```

5. 分别启动 API 和 Web：

   ```bash
   npm run dev:server
   npm run dev:web
   ```

## 部署

### 推荐Docker compose
首次部署前请先修改 `.env.compose`，至少配置这些值：

```env
POSTGRES_PASSWORD=<设置强密码>
JWT_SECRET=<至少32位随机字符串>
APP_ENCRYPTION_KEY=<至少32位随机字符串>
CORS_ORIGIN=https://your-domain.com,http://localhost:8080,http://127.0.0.1:8080
VITE_API_BASE_URL=/api
BACKUP_PAYLOAD_SIZE_MB=100
```
构建镜像并启动整套服务：

```bash
docker compose --env-file .env.compose up --build -d
```

浏览器访问：

```text
http://localhost:8080
```

## 仓库结构

```text
.
├── apps
│   ├── server
│   └── web
├── infra
│   └── postgres
├── packages
│   ├── api-client
│   ├── app-core
│   ├── db
│   └── domain
├── package.json
└── tsconfig.json
```

`apps/web/src` 仍按分层结构组织：

- `app`：应用入口与 providers
- `features`：功能页面与业务模块
- `widgets`：布局级拼装组件
- `shared`：可复用 UI 与工具
- `legacy`：当前仍服务于库存流程的兼容模块

## 环境变量

### Server

参考 [apps/server/.env.example](apps/server/.env.example)。

- `PORT`：API 端口
- `DATABASE_URL`：PostgreSQL 连接串
- `CORS_ORIGIN`：允许的前端来源
- `JWT_SECRET`：JWT 签名密钥，至少 32 个字符
- `UPLOAD_DIR`：上传图片保存目录
- `MAX_UPLOAD_SIZE_MB`：单张图片最大上传大小

### Web

参考 [apps/web/.env.example](apps/web/.env.example)。

- `VITE_API_BASE_URL`：API 基础地址

## 常用脚本

在仓库根目录执行：

```bash
npm run dev:web
npm run dev:server
npm run build
npm run lint
npm run typecheck
npm run db:up
npm run db:down
npm run db:logs
npm run db:generate
npm run db:migrate
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

本地 PostgreSQL 运行定义位于
[infra/postgres/docker-compose.yml](infra/postgres/docker-compose.yml)。
