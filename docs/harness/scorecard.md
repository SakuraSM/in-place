# Harness 评分标准

每项按 0–2 分评估：0 为缺失，1 为部分具备，2 为稳定可复现。总分不是发布许可，P0 风险未关闭时不得用分数抵消。

| 维度 | 2 分标准 |
| --- | --- |
| Correctness | 核心行为和失败路径有自动化或可复现手工证据 |
| Architecture | app/package 边界清楚，共享契约和数据访问方向一致 |
| Security & privacy | 权限由服务端执行，密钥/隐私不进入前端、日志和提交 |
| UX & accessibility | 桌面/移动、键盘、焦点和 loading/error/empty 已验证 |
| Testability | 触达范围有明确测试入口，失败能定位到模块 |
| Operability | 配置、迁移、健康检查、日志和恢复路径明确 |
| Documentation | 产品设计、架构、Harness 和用户入口与实现同步 |

## 当前基线（2026-08-10）

- 文档闭环：已建立。
- Workspace 脚本：具备 lint、test、typecheck 和 build 基础。
- CI：Mobile 类型检查和 Docker 构建已存在；通用 Web/Server 质量 workflow 仍缺失。
- 增量验证门禁、文档链接检查、秘密扫描：尚未建立。

后续优先级以 [门禁说明](guard-guide.md#当前门禁缺口) 为准。
