# 任务路由卡片

本文件帮助开发者和 Agent 快速选择阅读入口和最小验证，不替代变更协议或质量规则。

## web-ui

**适用：** 页面、组件、路由、响应式、表单、可访问性。

- 先读：`change-protocol.md`、`quality-rules.md`、相关产品设计文档。
- 关注：桌面/移动布局、键盘和焦点、loading/error/empty、API 错误恢复。
- 最小验证：Web lint、test、typecheck、build，加 1280×720 与 390×844 QA。

## asset-map

**适用：** 高德配置、坐标、投影、标记、聚合、筛选和地图详情。

- 先读：`../product/web-ui-functional-design.md`、`testing-guide.md#地图`。
- 关注：Key/安全密钥边界、角色权限、最近已标注位置、统计口径、响应式和 SDK 清理。
- 最小验证：地图纯函数与组件测试、Web typecheck/build、配置失败与真实地图 QA。

## server-api

**适用：** Fastify 路由、认证、家庭权限、上传、AI 和导入导出。

- 先读：`quality-rules.md#server-与-api`、目标架构。
- 关注：schema 校验、权限、错误暴露、第三方超时/大小限制、响应兼容。
- 最小验证：Server test、typecheck、build 和 API 成功/失败样例。

## database

**适用：** Drizzle schema、迁移、索引和数据约束。

- 先读：`quality-rules.md#数据库与迁移`、`testing-guide.md#数据库迁移`。
- 关注：已有数据兼容、锁和事务、回滚/向前修复、Server 消费方。
- 最小验证：DB typecheck/build、隔离数据库迁移、Server 相关测试。

## mobile

**适用：** Expo/React Native、原生构建、安全存储和跨客户端共享能力。

- 先读：`quality-rules.md#mobile-与共享包`、移动架构文档。
- 关注：平台差异、网络地址、权限、安全存储、Web/Mobile 契约一致性。
- 最小验证：Mobile lint/test/typecheck；需要时设备 QA，发版时 EAS build。

## deployment-release

**适用：** Dockerfile、Compose、环境变量、GitHub Actions、版本和 Release。

- 先读：README 部署章节、`guard-guide.md` 和相关 workflow。
- 关注：密钥、数据卷、迁移、健康检查、多架构镜像、版本同步和恢复。
- 最小验证：Compose config、受影响镜像构建、健康检查；发版前核对 tag 和 workflow。

## docs-only

**适用：** README、架构、产品设计和 Harness 文档。

- 先读：目标文档的索引和引用方。
- 关注：命令真实性、链接、术语一致、秘密和过时版本信息。
- 最小验证：`git diff --check`、相对链接与路径检查；代码块中的命令按风险抽样运行。
