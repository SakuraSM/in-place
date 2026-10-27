# 页面覆盖清单

以 `apps/web/src/app/App.tsx`、`apps/mobile/app` 和共享导航为当前入口依据。以下为设计覆盖，不表示功能已实现或验收。

| 设计板 | 模板 | Web 入口与 PNG | 移动入口与 PNG |
| --- | --- | --- | --- |
| 物品首页 | dashboard | [/](screens/web/home.png) | [/(tabs)](screens/mobile/home.png) |
| 库存检索 | collection | [/overview](screens/web/overview.png) | [/(tabs)/overview](screens/mobile/overview.png) |
| 空间位置 | split | [/locations](screens/web/locations.png) | [/(tabs)/locations](screens/mobile/locations.png) |
| 资产地图 | map | [/locations?view=map](screens/web/map.png) | [/(tabs)/locations → 地图](screens/mobile/map.png) |
| 物品详情 | detail | [/item/:id](screens/web/item.png) | [/item/[id]](screens/mobile/item.png) |
| 收纳详情 | detail | [/container/:id](screens/web/container.png) | [/container/[id]](screens/mobile/container.png) |
| 收纳内容 | collection | 不适用 | [/container/browse/[id]](screens/mobile/browse.png) |
| 新增 / 编辑物品 | form | [/?create=1；详情编辑浮层](screens/web/form.png) | [/item/form](screens/mobile/form.png) |
| 分类管理 | collection | [/categories](screens/web/categories.png) | [/manage/categories](screens/mobile/categories.png) |
| 标签管理 | collection | [/tags](screens/web/tags.png) | [/manage/tags](screens/mobile/tags.png) |
| 操作记录 | timeline | [/activity](screens/web/activity.png) | [/(tabs)/activity](screens/mobile/activity.png) |
| 管理中心 | hub | [/manage](screens/web/manage.png) | [/(tabs)/categories](screens/mobile/manage.png) |
| 拍照录入 | capture | [/scan](screens/web/scan.png) | [/(tabs)/scan](screens/mobile/scan.png) |
| 扫标签归位 | capture | [/scan/codes](screens/web/scan-code.png) | [/scan-code](screens/mobile/scan-code.png) |
| 标签绑定 / 连续归位 | task | [/s/:code](screens/web/resolve.png) | [/scan-code → 扫描结果](screens/mobile/resolve.png) |
| 标签打印 | split | [/labels](screens/web/labels.png) | [/operations/labels](screens/mobile/labels.png) |
| 家庭盘点 | task | [/stocktakes](screens/web/stocktakes.png) | [/operations/stocktakes](screens/mobile/stocktakes.png) |
| 盘点详情 | task | [/stocktakes/:id](screens/web/stocktake-detail.png) | [/operations/stocktakes/[id]](screens/mobile/stocktake-detail.png) |
| 提醒中心 | collection | [/reminders](screens/web/reminders.png) | [/operations/reminders](screens/mobile/reminders.png) |
| 家庭库存报告 | report | [/reports](screens/web/reports.png) | [/operations/reports](screens/mobile/reports.png) |
| 重复物品 | task | [/duplicates](screens/web/duplicates.png) | [/operations/duplicates](screens/mobile/duplicates.png) |
| 家庭空间 | settings | [/household](screens/web/household.png) | [/profile/household](screens/mobile/household.png) |
| 加入家庭 | auth | [/household/join/:token](screens/web/invite.png) | [/household/join/[token]](screens/mobile/invite.png) |
| 我的 | settings | [/profile](screens/web/profile.png) | [/(tabs)/profile](screens/mobile/profile.png) |
| 编辑资料 | form | 不适用 | [/profile/edit](screens/mobile/profile-edit.png) |
| AI 配置 | settings | [/profile/ai](screens/web/ai.png) | [/profile/ai](screens/mobile/ai.png) |
| 账号安全 | settings | [/profile/security](screens/web/security.png) | [/profile/security](screens/mobile/security.png) |
| 数据管理 | settings | [/profile/data](screens/web/data.png) | [/profile/data](screens/mobile/data.png) |
| 关于归位 | settings | 不适用 | [/profile/about](screens/mobile/about.png) |
| 登录 | auth | [/login](screens/web/login.png) | [/(auth)/login](screens/mobile/login.png) |
| 注册 | auth | [/register](screens/web/register.png) | [/(auth)/register](screens/mobile/register.png) |
| 原生地图桥接画布 | map | [/mobile-map](screens/web/mobile-map.png) | [WebView 内部画布](screens/mobile/mobile-map.png) |
| 部署状态 | settings | [平台模式入口，非业务路由](screens/web/platform.png) | 不适用 |
| 组件与排版 | system | [设计规范](screens/web/components.png) | [设计规范](screens/mobile/components.png) |
| 状态与反馈 | system | [通用状态](screens/web/states.png) | [通用状态](screens/mobile/states.png) |

## 复用与重定向

- Web `/search` 重定向到 `/overview`；`/notes` 重定向到 `/tags`；未知地址按现有逻辑返回首页。
- 移动根入口、认证布局和 tabs 布局不独立出稿；它们的导航壳由各页面共用。
- 原生管理中心使用现有 `/(tabs)/categories`；分类编辑使用 `/manage/categories`，两者语义不同。
- Web 新增 / 编辑沿用现有浮层，稿件将表单内容展开以方便评审。
- 原生地图桥接画布是内部 WebView 页面，地图详情与筛选复用地图稿。
- `PlatformStatusPage` 通过平台模式渲染，未加入主业务路由。
- 33 个页面或状态设计板加 2 个设计系统板，共 35 项；按端适用性导出 32 张 Web 与 34 张移动 PNG。
