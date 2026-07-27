# 预设分类插画

此目录是 Web 与 App 共用的 21 个预设分类视觉资产。每个预设包含：

- `*.webp`：Web 使用的 512 × 512 透明资源。
- `*.png`：App 通过静态 `require` 打包的 512 × 512 透明资源。
- `preset_key`、文件名、旧默认图标和图片说明：见 `packages/ui/src/category-artwork.ts`。

## 视觉基准

生成模式：内置 `image_gen`，`stylized-concept`。

基准提示词：柔和 3D clay 风格、圆润哑光材质、微俯视三分之四视角、主体居中并占画布约 68%、均匀留白、柔和棚拍光；无文字、人物、品牌、边框、投影或高反射材质。位置使用天空蓝，收纳使用青绿，物品使用暖黄/橙，三组均保留少量品牌青绿 `#0D9488`。

生成时使用纯色 `#ff00ff` 抠图背景，随后本地完成软边透明化、边缘去色，并输出 512 × 512 PNG/WebP。各图主体提示如下：

| preset_key | 主体 |
| --- | --- |
| `location.apartment` | 现代公寓楼 |
| `location.room` | 带床和灯的房间场景 |
| `location.floor` | 三层建筑楼层叠层 |
| `location.outdoor` | 树、长椅和小径 |
| `location.garage` | 车库与汽车 |
| `container.cabinet` | 双门柜子 |
| `container.drawer` | 三层抽屉柜 |
| `container.box` | 带盖收纳箱 |
| `container.shelf` | 三层置物架 |
| `container.fridge` | 双门冰箱 |
| `container.bag` | 软质收纳包 |
| `item.digital` | 电脑、手机与耳机 |
| `item.clothing` | 服饰、鞋与包 |
| `item.books` | 书本、笔记本与铅笔 |
| `item.kitchen` | 锅具、餐盘与锅铲 |
| `item.appliances` | 水壶、吸尘器与电视 |
| `item.tools` | 工具箱与五金工具 |
| `item.cleaning` | 喷壶、海绵与清洁刷 |
| `item.health` | 急救箱、药瓶与体温计 |
| `item.toys` | 积木、小汽车与玩偶 |
| `item.valuables` | 证件、纪念章与收藏盒 |
