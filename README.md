# 日常 · Coffee Atelier

一个以 Vite + Three.js 构建的交互式 3D 卡布奇诺网页。磨砂玻璃控制面板，支持热饮陶瓷杯、冷饮透明玻璃杯、Regular / Strong、分阶段注入咖啡与牛奶、奶泡拉花、浮动冰块、持续蒸汽以及拖动旋转。兼容桌面和手机，遵循系统减少动态效果偏好。

## 开发

需要 Node.js 20.19+ 或 22.12+（已使用 Node.js 24 验证）。

```sh
npm ci
npm run dev
```

在 Vite 输出的地址打开网页。选择温度与浓度，点击“开始制作”，约 11 秒完成；拖动杯子旋转，点击“再做一杯”重播。更换选项会清空杯子，准备新配方。无需 API、账号、环境变量或后端服务。3D 场景需要浏览器支持 WebGL。

## 检查与构建

```sh
npm run check
npm run build
npm run check:dist
npm run preview
```

构建文件位于 `dist/`，可部署到任意静态托管服务。开发与预览默认监听所有网卡，适合云环境。字体使用可选的 Google Fonts；不可用时自动使用本地宋体或衬线字体。所有杯子、液体、冰块与蒸汽均由代码生成，无外部模型依赖。

## GitHub Pages 发布

本项目必须先用 Vite 构建，再发布 `dist/`，不能直接发布仓库根目录的源码。源码中的 npm 导入和 CSS 导入由 Vite 处理，直接托管源码会导致无样式、按钮失效。

仓库包含 `.github/workflows/deploy.yml`。推送到 `main` 后，GitHub Actions 会安装依赖、检查、构建并发布 `dist/`。资源使用相对路径，支持 `https://aplusdg.github.io/coffee/`。

在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。在 **Actions → Deploy coffee to GitHub Pages** 查看发布结果；也可用 **Run workflow** 手动重新发布。第一次发布需要完成上述 Source 设置，再运行工作流。不要选择从 `main / (root)` 直接发布源码。
