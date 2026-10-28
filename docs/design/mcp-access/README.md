# MCP 接入验证

2026-10-28，使用本地隔离数据库、虚构账号和已撤销的测试凭证。图片中的服务地址是本地验证地址。

- [Web 设置页](web-settings.png)
- [390px 移动 Web](web-mobile.png)
- [Agent 导入后的实际库存](agent-import-result.png)
- [原生凭证表单](native-form.png)
- [原生凭证撤销](native-revoked.png)
- [真实 HTTP 客户端及 Node 20 容器检查](network-checks.json)
- [完整镜像与 Nginx 入口检查](image-checks.json)

Web 实际完成创建导入凭证、保存一次性凭证、撤销；Android 实际完成创建 30 天只读凭证及撤销。真实 Agent 客户端完成预览、三层新增、相同请求去重、检索和撤销后的 401 检查。

所有截图保留真实运行界面，没有使用视觉稿代替业务界面。完整凭证和登录信息不保存在本目录。Android 为模拟器证据，iOS 与完整读屏未验收；网页控件标签与权限选择已有组件测试。

后续网页 A11y 检查可使用 deterministic-frontend 的 `scripts/a11y-audit.sh <URL>`，需先为检测浏览器准备登录态。现有 Ego 登录态不会自动传给该 CLI。
