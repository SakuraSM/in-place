# 测试策略

目标不是盲目跑全部命令，而是为触达范围提供最小、可复现、能覆盖失败路径的证据。所有命令默认在仓库根目录执行。

## 基础命令

```bash
npm run lint
npm run typecheck
npm run build
```

这些命令适合跨 workspace 或交付前检查。局部开发优先使用下面的专项命令。

## Workspace 验证矩阵

| 触达范围 | 最小自动化验证 | 补充验证 |
| --- | --- | --- |
| `apps/web` | `npm run lint --workspace @inplace/web`；`npm test --workspace @inplace/web`；`npm run typecheck --workspace @inplace/web` | `npm run build:web`；桌面和移动 Web 手工 QA |
| `apps/server` | `npm test --workspace @inplace/server`；`npm run typecheck --workspace @inplace/server` | `npm run build:server`；健康检查和相关 API 成功/失败样例 |
| `apps/mobile` | `npm run lint --workspace @inplace/mobile`；`npm test --workspace @inplace/mobile`；`npm run typecheck --workspace @inplace/mobile` | Expo/设备验证；发布时再执行对应 EAS 构建 |
| `packages/db` | `npm run typecheck --workspace @inplace/db`；`npm run build:db` | schema 变化时生成并审查迁移，在隔离数据库执行迁移 |
| `packages/domain` / `app-core` / `api-client` / `ui` | 对应 workspace `typecheck` | 执行直接消费端的测试和构建 |
| 类别图资源 | `npm run artwork:validate` | Web/Mobile 实际展示和回退图标 |
| Docker / Compose | `docker compose --env-file .env.compose config` | 构建受影响镜像，启动健康检查；不要删除现有数据卷 |
| 文档 | `git diff --check` | 检查相对链接、命令、文件路径和中英文入口 |

## 按能力补充验证

### 地图

- `npm test --workspace @inplace/web -- geoAssetMap`
- `npm test --workspace @inplace/web -- AssetMapView`
- 验证地图未配置、配置失败、SDK 失败、无标记、无结果、单点、聚合点、选中点和重新标注。
- 验证 owner/editor/viewer 三种角色；安全密钥不能出现在浏览器响应和资源中。
- 验证位置树切换地图时的滚动、筛选、选择和返回上下文。

### 认证与权限

- 覆盖未登录、过期/撤销会话、非家庭成员、viewer 写操作和 owner/editor 正常操作。
- 同时验证前端入口和服务端拒绝；前端状态不能替代 API 权限测试。

### 上传、AI 与备份

- 覆盖文件类型、大小、损坏图片、超时、第三方错误和响应过大。
- 备份导入使用临时测试数据库，验证无效结构、版本不匹配和事务失败。
- 测试数据和日志中不得包含真实 API Key 或私人库存。

### 数据库迁移

1. 生成迁移后审查 SQL 和 schema 差异。
2. 在隔离数据库上从旧 schema 迁移。
3. 启动 Server，执行受影响 API。
4. 记录恢复或向前修复方式；不要用生产数据试验。

## 手工 QA 记录

没有自动化覆盖时，至少记录：

```md
- Environment:
- Data setup:
- Steps:
- Expected:
- Observed:
- Screenshot/log evidence:
- Cleanup:
```

未运行的命令必须写原因，例如缺少 EAS 凭据、高德测试域名、原生设备或 Docker 运行时。
