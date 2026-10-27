# 应用运行证据

本目录保存 2026-10-27 的真实应用截图和检查记录，使用隔离 API 与虚构家庭数据。原始静态视觉稿位于上一级 `screens/`，两类图片不混用。

- [双端实现总览](overview.png)
- [Web 首页](web-home.png)、[库存](web-overview.png)、[移动首页](web-mobile-home.png)
- [Web 登录](web-login.png)、[注册](web-register.png)
- [Android 首页](android-home.png)、[库存](android-overview.png)、[登录](android-login.png)、[注册](android-register.png)
- [原生软键盘与保存操作](android-keyboard.png)
- [原生 1.3 字号首页](android-font130.png)、[1.3 字号库存](android-overview-font130.png)
- [桌面首页同框对比](comparison-home.png)、[库存同框对比](comparison-overview.png)
- [移动 Web 首页同框对比](comparison-mobile-home.png)、[原生认证同框对比](comparison-native-auth.png)
- [字体与间距局部对比](comparison-focus.png)
- [受控 SDK 失败时的地图布局](map-sdk-failure.png)
- [逐页检查记录](runtime-checks.json)
- [原生库存页补查与修复前后截图](inventory-correction/README.md)

Web 标准截图为 1440×1024 和 390×844；Android 原始截图为 1080×2400，包含系统状态栏与导航区域。原生对比图的裁切和密度归一化说明见仓库根目录 `design-qa.md`，不将设备差异误判为像素级一致。

`runtime-checks.json` 保留逐页运行时的原始截图路径。全部原始输出在本机 `/tmp/inplace-ui-20261027/`，本目录另保存经过视觉查看的代表截图。受控地图与桥接记录使用模拟配置并阻止 SDK 外部请求，不代表真实地图服务验收。

验证命令、实际交互、已修正问题和未验收项见 [UI 验证报告](../../../../design-qa.md)。
