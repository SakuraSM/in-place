# 门禁说明

本仓库当前使用 npm workspace 脚本和 GitHub Actions 作为门禁基础，尚未建设自定义的增量验证门禁。

## 本地门禁

交付前根据改动执行 [测试矩阵](testing-guide.md)。跨 workspace 改动建议运行：

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

提交前还要确认：

```bash
git status --short
git diff --stat
git diff --cached --stat
```

- 只暂存本次改动，不纳入 `.env*`、本地数据、截图临时文件或用户未跟踪目录。
- 锁文件只有在依赖图确实变化时修改。
- 生成物、容器和临时数据库不作为代码交付内容。

## 现有 CI

| Workflow | 触发范围 | 当前保障 |
| --- | --- | --- |
| `docker-images.yml` | Web、Server、Packages、Compose 等 | 构建 server、web、all-in-one 镜像；main/tag 发布镜像与证明材料 |
| `mobile-apps.yml` | Mobile 及共享包 | Mobile 类型检查；非 PR 场景按凭据运行 EAS 构建 |
| `release.yml` | `v*` 标签或手动发版 | 同步版本、提交 main、创建 GitHub Release |
| `copilot-setup-steps.yml` | Copilot/UI 提示资产 | 安装依赖并验证提示资产 |

## 当前门禁缺口

- 普通 PR 没有统一运行 Web/Server 的 lint、test、typecheck 和 build。
- 没有按变更范围自动选择验证命令的增量验证脚本。
- 没有 Markdown 链接检查和秘密扫描的仓库级工作流。
- Docker PR 构建只能证明镜像可构建，不能替代应用测试和运行时 QA。

在这些 CI 缺口补齐前，PR 必须把本地验证结果写进描述，不能把“CI 未报错”当作完整质量证明。

## 建议后续门禁顺序

1. 新增统一 Quality workflow：lint、typecheck、Web/Server/Mobile 测试和 Web/Server 构建。
2. 增加文档链接、敏感信息和 Compose 配置检查。
3. 再评估按 Git diff 路由的增量验证脚本，先保持规则简单、透明且容易维护。
