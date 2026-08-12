# Web UI 与地图功能设计基线

本文记录 InPlace Web 端当前的信息架构、交互约定、地图能力、排障入口和已知设计风险。它描述的是稳定的产品意图与验证路径，不替代具体实现、接口文档或测试代码。

- 适用范围：`apps/web`、相关 API 与共享包。
- 最近复核：2026-08-11。
- 视觉基线：[Web 首页](../assets/inplace-home.png)、[地理资产地图](../assets/inplace-asset-map.jpg)。
- 工程变更与验证要求：[Harness 文档入口](../harness/README.md)。

## 产品目标与对象模型

InPlace 用“位置 → 收纳 → 物品”表达家庭库存。用户既可以按层级理解物品放在哪里，也可以跨位置搜索、按地理分布浏览，并从盘点、标签和提醒等任务进入后续操作。

- 位置：公寓、房间、楼层、车库等固定空间，可拥有地理坐标。
- 收纳：柜子、箱子、抽屉等可嵌套容器，不直接承担地理坐标语义。
- 物品：数量、状态、分类、标签、价格、日期等库存记录。
- 地图点：由已标注坐标的位置产生，位置下的嵌套物品投影到最近的已标注位置。

## 信息架构

| 页面 | 路由 | 用户目标 | 主要代码入口 |
| --- | --- | --- | --- |
| 物品首页 | `/` | 快速查看库存状态、最近添加、最近操作和常用任务 | `apps/web/src/features/inventory/pages/HomePage.tsx`、`components/HomeDashboard.tsx` |
| 库存检索 | `/overview` | 跨位置搜索和组合筛选全部库存 | `apps/web/src/features/inventory/pages/SearchPage.tsx` |
| 空间位置 | `/locations` | 在位置树中理解层级和当前位置内容 | `apps/web/src/features/inventory/pages/LocationTreePage.tsx`、`components/LocationTreeView.tsx` |
| 资产地图 | `/locations?view=map` | 查看地理分布、筛选地图资产、选点下钻和标注坐标 | `components/AssetMapView.tsx`、`AmapAssetCanvas.tsx`、`GeoAssetMapSidebar.tsx` |
| 管理中心 | `/manage` | 在移动 Web 集中进入位置、分类、标签、盘点、报告等低频任务 | `apps/web/src/features/operations/pages/ManagePage.tsx` |
| 分类管理 | `/categories` | 分别维护位置、收纳和物品分类及其展示图标 | `apps/web/src/features/inventory/pages/CategoriesPage.tsx` |
| 标签管理 | `/tags` | 维护跨物品使用的标签 | `apps/web/src/features/tags/pages/TagsPage.tsx` |
| 操作记录 | `/activity` | 追踪新增、修改和库存操作 | `apps/web/src/features/activity/pages/ActivityPage.tsx` |
| 拍照录入 | `/scan` | 通过图片识别辅助新增库存 | `apps/web/src/features/inventory/pages/ScanPage.tsx` |
| 家庭任务 | `/stocktakes`、`/reminders`、`/household` | 盘点、提醒和家庭协作 | `apps/web/src/features/operations/pages` |

首页负责“今天要看和要做什么”，库存检索负责“查找某个对象”，空间位置负责“它在哪里”。三者职责不同，不应合并成同一种列表页。

## 核心交互设计

### 首页

- 默认展示库存统计、最近添加、最近操作和高频任务入口。
- “按类型 / 按分类”仅改变首页库存分组，不改变底层数据。
- 桌面端在页头提供“批量”和“新增”；移动端使用悬浮新增按钮。
- 统计卡片和最近记录都是可操作入口，而不是纯展示数据。

### 库存检索

- 搜索、类型、状态、标签、位置共同组成筛选条件。
- 结果同时包含位置、收纳和物品，类型标签必须始终可见。
- 保存筛选表示保存检索意图，不应复制库存数据。
- 点击结果进入对应位置、收纳或物品详情。

### 移动管理中心

- 移动端底部“管理”进入 `/manage`，不能直接冒充分类管理。
- 位置与地图、分类、标签和操作记录属于基础管理；盘点、提醒、报告、重复项和标签工具属于库存工具。
- Web 与原生端共享“管理中心”的任务分组，具体路由可以由平台适配器分别实现。

### 位置树与资产地图

- 两种视图共享“空间位置”页面，通过 `view` 查询参数切换；默认进入位置树。
- 位置树强调层级、当前位置、下级统计和内容下钻。
- 地图强调地理分布、聚合浏览、筛选和坐标维护。
- 从地图进入详情后，目标对象仍遵循既有位置/收纳/物品详情路由，不建立地图专属副本。

### 新增表单

- 一个表单支持新增物品或收纳，类型切换不会创建中间数据。
- 名称是首要必填字段；类别、状态、位置决定后续组织方式。
- 保存按钮在表单有效前保持禁用；移动端固定在底部。
- 图片、标签、价格、日期等属于补充信息，不应阻断最小新增流程。

## 地图功能契约

### 数据投影

1. 读取家庭完整库存并建立位置、收纳、物品层级。
2. 已标注坐标的位置形成地图点。
3. 物品向上查找最近的已标注位置并归入该点。
4. 找不到已标注位置的物品计入“未定位资产”。
5. 坐标保存在位置的 `metadata.geo_location`，当前不需要数据库迁移。

核心实现位于：

- `apps/web/src/features/inventory/lib/assetMap.ts`
- `apps/web/src/features/inventory/lib/geoAssetMap.ts`
- `apps/web/src/features/inventory/lib/geoAssetMapFilters.ts`

### 标记与聚合

- 单点标记使用对应最外层位置分类的图标，并显示资产数量角标和位置名称。
- 相邻地图点由高德 MarkerCluster 聚合；展开后仍以位置为选择单位。
- 点击标记后，右侧详情显示地址、资产种类、估算价值和此处资产。
- 地图区域支持左右方向键在标记之间移动，`Escape` 清空选择。

### 筛选和统计

- 支持名称、分类、标签、地址搜索。
- 支持资产状态、资产分类和创建日期区间筛选。
- “匹配资产”和“匹配估值”随筛选变化；“已标注位置”和“未定位资产”是全量统计。
- 地图筛选写入 `mapQuery`、`mapStatus`、`mapCategory`、`mapFrom`、`mapTo` 查询参数，刷新、后退和分享必须保留筛选意图。

### 坐标标注和权限

- 家庭所有者和编辑者可以为位置首次标注或重新标注坐标。
- 查看者只能浏览地图和资产详情。
- 选点后通过高德逆地理编码识别地址，再更新位置元数据。
- 权限判断必须以后端授权为准，前端隐藏按钮不是安全边界。

### 配置和安全边界

- 必须成对配置 `AMAP_JS_API_KEY` 和 `AMAP_JS_SECURITY_CODE`。
- Key 必须属于高德 Web端（JS API）；生产域名需加入对应白名单。
- 安全密钥只供服务端同源代理使用，不得写入 `VITE_*`、前端代码、日志、截图或版本控制。
- Web 端从 `/api/v1/maps/config` 获取启用状态、公开 Key 和同源代理路径，不接收安全密钥。

相关入口：

- `apps/server/src/modules/maps/map.routes.ts`
- `apps/web/src/features/inventory/lib/amapSdk.ts`
- `apps/web/src/features/inventory/api/mapApi.ts`

## 响应式与可访问性约定

- 桌面端使用可折叠侧边栏；移动端使用五项底部主导航。
- 地图桌面端为“画布 + 详情侧栏”；移动端使用单行紧凑统计、常驻搜索和可折叠高级筛选，首屏必须露出地图画布。
- 移动首页把“最近添加 / 最近操作”收敛到同一张最近动态卡片；移动新增表单默认折叠价格、日期、追踪、标签和图片。
- 页面必须保留主内容跳转链接、可见焦点、语义化区域和可访问名称。
- 图标按钮必须有 `aria-label` 或等价文本；地图标记必须可通过键盘选择。
- 动效遵循用户的 reduced-motion 设置。
- 截图检查不能替代键盘、读屏、缩放和颜色对比度验证。

## 已知设计风险与后续边界

| 优先级 | 风险 | 影响 | 建议方向 |
| --- | --- | --- | --- |
| P3 | 模拟器 DNS 可能阻断高德公共脚本 | 原生地图显示明确超时错误，其他位置能力仍可用 | 先验证设备 `webapi.amap.com` DNS，再排查 Key 与代理；统计口径已由 Web/Android 共用 |
| P2 | 已使用分类删除后，历史记录保留分类文字 | 管理员可能需要手工迁移旧记录 | 删除前展示使用数量和影响；后续如引入迁移，应复用批量编辑能力 |
| P3 | 地图高级分析能力尚未加入 | 热力图、轨迹和路线规划会显著增加复杂度 | 在真实家庭规模和使用频率验证前不进入主路线 |

## 排障路径

| 现象 | 首先确认 | 继续定位 |
| --- | --- | --- |
| 地图显示“尚未启用” | 两个高德变量是否成对配置，服务是否重启 | `/api/v1/maps/config` 响应和 `AssetMapView.tsx` 配置状态 |
| 高德返回 `USERKEY_PLAT_NOMATCH` | 实际加载域名、Key 所属服务、域名白名单和安全代理是否匹配；不能仅凭错误码断言 Key 内容错误 | 浏览器网络请求、服务端地图代理日志、高德控制台配置 |
| 地图加载失败但配置接口正常 | SDK 请求、代理响应、CSP/CORS、生产域名 | `amapSdk.ts`、`AmapAssetCanvas.tsx` 和浏览器控制台 |
| 地图没有标记 | 位置是否存在有效 `metadata.geo_location`，经纬度是否为数字且在合法范围 | `geoAssetMap.ts` 的投影结果和位置详情数据 |
| 物品落到错误地图点 | 物品向上的位置链和最近已标注位置是否符合预期 | `resolveMappedLocation` 相关测试和 `assetMap.ts` 层级 |
| 标记图标错误或退化为默认图标 | 最外层位置分类、分类范围和图标资源是否匹配 | 分类 API、`categoryPresentation`、`AmapAssetCanvas.tsx` |
| 筛选后数量或金额“对不上” | 区分全量统计和筛选后统计 | `AssetMapSummary.tsx`、`geoAssetMapFilters.ts` |
| 切换到地图后不在页面顶部 | `data-scroll-root` 的 `scrollTop` 和 `view` 查询参数 | `ScrollToTop.tsx`、`LocationTreePage.tsx` |
| 查看者出现编辑入口或保存被拒绝 | 当前家庭角色及后端权限 | `HouseholdProvider`、地图保存请求和服务端授权 |

排障时不要输出真实 Key、安全密钥、家庭精确地址或用户库存数据。需要截图时使用脱敏测试数据。

## 变更验证清单

- 首页、库存检索、管理中心、位置树和地图之间可以往返，返回后上下文符合预期。
- 地图筛选刷新后仍然保留；筛选变化不复位滚动，位置树/地图切换会复位滚动。
- 地图关闭、加载中、加载失败、无标记、无筛选结果和选中标记状态均可理解。
- 搜索、状态、分类和日期筛选分别验证，并检查统计口径。
- 所有者/编辑者可以标注，查看者只能浏览。
- 桌面端至少验证 1280×720；移动 Web 至少验证 390×844。
- 使用键盘完成视图切换、筛选、标记选择、详情打开和表单关闭。
- 不在浏览器资源、日志和提交差异中出现高德安全密钥。
- 按 [测试策略](../harness/testing-guide.md) 执行触达范围的自动化与构建验证。
