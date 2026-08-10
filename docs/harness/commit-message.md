# Commit Message 约定

推荐格式：

```text
<type>(<scope>): <summary>
```

- `type`：`feat`、`fix`、`docs`、`refactor`、`test`、`build`、`ci`、`chore`、`release`。
- `scope` 可选：`web`、`server`、`mobile`、`db`、`map`、`auth`、`docs`、`release` 等稳定模块名。
- `summary` 使用简短祈使语义，说明产生的结果，不写过程日志。

示例：

```text
feat(map): show outer location icons on markers
fix(web): reset scroll when switching location views
docs(harness): add validation and troubleshooting guides
chore(release): v0.3.1
```

原则：

- 一个提交只表达一个目的。
- 破坏性变化在正文写 `BREAKING CHANGE:` 并提供迁移方式。
- 自动版本提交继续使用 `chore(release): vX.Y.Z`。
- 不在提交信息中包含密钥、私人数据、临时调试地址或无意义描述。
