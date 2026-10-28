# MCP 库存访问

Web 与原生 App 均可在「我的 → MCP 接入」创建凭证，让 Agent 查询库存，并批量新增物品、位置和收纳。

## 连接 Agent

1. 选择要授权的家庭，进入「MCP 接入」。
2. 填写凭证名称和有效期。默认仅查询，需要录入时勾选「允许批量新增物品、位置和收纳」。
3. 创建凭证，复制 MCP 地址和凭证，或直接复制连接配置。完整凭证仅显示一次，不写入浏览器存储或原生持久化存储。
4. 在支持 Streamable HTTP 与 Bearer 请求头的 Agent 客户端中添加服务。

```json
{
  "mcpServers": {
    "inplace": {
      "url": "https://inventory.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_MCP_CREDENTIAL>"
      }
    }
  }
}
```

具体配置字段以客户端为准。完整凭证应保存到客户端的凭证设置中，不应加入 Git。当前提供手动 Bearer 凭证接入，没有实现 OAuth 授权流程。

有效期选项为 7、30、90、365 天，默认 90 天。凭证固定绑定创建时的家庭与成员身份；切换当前家庭不会改变它的范围。退出登录不会撤销 Agent 凭证，可在此页主动撤销。

## MCP 工具

| 工具 | 能力 | 权限 |
| --- | --- | --- |
| `inventory_context` | 当前家庭与导入权限、批次限制 | 查询 |
| `inventory_search` | 按名称、类型、状态、标签、父级或位置分页检索，每页最多 100 条 | 查询 |
| `inventory_get` | 记录详情与上级路径 | 查询 |
| `inventory_categories` | 当前家庭已有分类 | 查询 |
| `inventory_import` | 批量新增物品、位置、收纳，并建立父子关系 | 导入 |

只读凭证和只读家庭成员看不到导入工具。每次请求均重新核验成员关系、有效期和撤销状态；正式写入时再次核验权限。成员被移除时凭证随成员记录删除，重新加入家庭后旧凭证也不能恢复。

## 批量新增

以下参数传给 `inventory_import`，先执行预览，再以相同 `requestKey` 和 `items` 将 `dryRun` 改为 `false`。

```json
{
  "requestKey": "agent-import-20261028-01",
  "dryRun": true,
  "items": [
    { "key": "room", "kind": "location", "name": "书房" },
    { "key": "box", "kind": "container", "name": "相机收纳箱", "parentKey": "room" },
    { "key": "camera", "kind": "item", "name": "相机", "parentKey": "box", "quantity": 1 }
  ]
}
```

- 每批 1–100 条，HTTP 请求体最多 1 MiB。默认 `dryRun=true`，只校验和预览。
- `kind` 可选 `item`、`container`、`location`。`key` 在本批次中唯一。
- `parentKey` 引用同批次的位置或收纳，顺序不限；`parentId` 引用当前家庭已有位置或收纳。两者互斥，均省略时放到根目录。
- 还可填写分类名称、描述、数量、价格、状态、追踪方式、日期、图片、标签和 metadata。可先通过 `inventory_categories` 选择分类。
- 正式写入将库存、标签、活动记录和请求记录放在一个事务中。任一步失败整批回滚，已有记录不被覆盖。
- 去重范围是「凭证 + requestKey」。相同内容重试返回首次结果，内容改变须使用新编号。预览不占用编号。
- 活动记录保留 `source=mcp`、凭证 ID 和请求编号，便于追踪来源。

本入口仅批量新增。备份恢复继续通过「数据管理」完成。

## 部署

对外服务应将 `PUBLIC_ORIGIN` 配置为实际 HTTPS 访问地址。MCP 地址为该地址下的 `/api/mcp`；现有 `/api` 反向代理规则即可转发。浏览器客户端的 Origin 还需在 `CORS_ORIGIN` 中配置。

本次新增迁移 `0013_create_mcp_access.sql`。Docker 启动脚本会先执行迁移；本地运行前执行：

```sh
npm run db:migrate --workspace @inplace/db
```

数据库保存凭证摘要、权限、期限与使用时间，不保存完整凭证。凭证管理 API 使用正常登录会话，MCP 端点仅接受专用凭证。配置生产地址时不要将开发服务器的回环地址复制给远程 Agent。

应用可先回退到旧版本，新增表可以保留；清除凭证和导入请求记录需要单独的数据迁移。

## 影响范围

- Server：MCP Streamable HTTP 端点、凭证管理、批量新增事务。
- DB：新增凭证和导入请求记录表，迁移只增加表与索引。
- Domain / App Core：两端共用的凭证契约与 API。
- Web / Mobile：个人设置中的 MCP 接入页面，复用现有页面与表单组件。
- 保留：现有登录、备份恢复流程、库存读写权限，以及无关 `.doc/`。

凭证仅作用于创建时的家庭和创建者当前权限。提供读取与导入权限、有效期和撤销能力；数据库保存摘要，完整凭证只在创建后显示一次。每次 MCP 请求检查成员关系、权限、有效期与撤销状态。

批量导入仅新增记录，最多 100 条。预览校验参数与父级关系，正式导入在一个事务内完成库存、标签、活动记录和请求去重记录。相同凭证与请求编号的重试返回首次结果，改变内容须使用新编号。

## 验证结果

- 2026-10-28：Server 66 项、Web 113 项、Mobile 82 项测试通过；仓库 lint、typecheck、build 通过。
- Server 测试包含真实 SDK 客户端与隔离 PostgreSQL，覆盖凭证摘要、过期、撤销、家庭隔离、角色降级、成员移除后重新加入、旧协议初始化、非法父级、循环、并发去重和实际事务回滚。
- 从 Web 设置页创建凭证后，以真实 HTTP MCP 客户端预览、导入三层库存、重试和检索成功；Web 库存页可见三条新记录。撤销后请求返回 401。
- Web 1440 / 390 宽度实测无横向溢出；Android 模拟器完成登录、创建 30 天只读凭证、关闭一次性显示和撤销。iOS 真机与读屏未验收。
- Server、Web、一体化完整 ARM64 镜像本地构建通过，启动后健康检查均返回 200。一体化和拆分 Web 的 Nginx 入口均验证了 MCP 调用，测试凭证已撤销。
- Node 20 生产模式容器完成凭证创建、MCP 查询和撤销，测试使用本地 HTTP 和代理 Host。PR 镜像工作流另构建 AMD64 镜像，并在隔离 PostgreSQL 中执行迁移与 MCP 集成测试。
- 原生图片仅向当前配置的 API origin 发送登录凭证，异常大小写 URL、前置空白和无效配置均有回归测试。
- [界面与联调证据](../design/mcp-access/README.md)保留脱敏截图和检查记录。测试凭证已撤销，没有部署到生产环境。

MCP 使用官方 SDK 2.4，并单独使用 Zod 4.6.7 校验新入口；既有 REST 的 Zod 3 契约保持兼容。协议接入依据：[官方 HTTP 接入说明](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md)。
