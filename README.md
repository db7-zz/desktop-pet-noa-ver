# 诺哥桌宠

诺哥是一款纯本地、独立运行的 Windows 桌宠。程序不联网、不读取其他应用状态，也不需要用户安装 Node.js 或开发工具；下载便携版后双击 `.exe` 即可。

## 普通用户使用

- 启动：双击 `Nuoge-Desktop-Pet-1.0.0-portable.exe`。
- 拖动：按住诺哥身体的可见区域并拖动；周围透明区域会尽量穿透到下方窗口。
- 互动：单击播放开心动画；双击切换睡觉/醒来。
- 隐藏或退出：右键诺哥，或使用系统托盘中的“隐藏桌宠”“退出”。直接关闭窗口时只会隐藏到托盘。
- 缩放、静音、重置位置：在右键菜单或托盘菜单设置。位置和选项会自动保存。
- 开机自启动：在右键菜单或托盘菜单勾选“开机自启动”；再次取消勾选即可关闭。

## 替换角色素材

角色位于 `assets/nuoge/`，每个动作一个目录：

```text
assets/nuoge/
  config.json
  icon.png
  idle/frame-01.png ...
  idle_b/frame-01.png ...
  happy/frame-01.png ...
  sleep/frame-01.png ...
  wake/frame-01.png ...
  working/frame-01.png ...
  success/frame-01.png ...
  error/frame-01.png ...
```

推荐使用透明背景、相同画布尺寸的 PNG 序列帧，并按 `frame-01.png`、`frame-02.png` 递增命名。随后在 `config.json` 中配置帧路径、`fps`、`loop` 和非循环动作的 `next`。动作文件缺失时程序会尝试回退到 `idle`。GIF/WebP 可作为后续兼容项，第一版播放器以 PNG 序列为准。

## 本地开发

要求 Node.js 20 或更高版本：

```powershell
npm install
npm start
```

运行测试：

```powershell
npm test
```

## Windows 打包

```powershell
npm run dist
```

便携版输出到：

```text
release/Nuoge-Desktop-Pet-1.0.0-portable.exe
```

打包后的用户只需要 `.exe`，无需安装 Node.js。构建目录 `release/` 和依赖目录 `node_modules/` 已被 `.gitignore` 排除。

## 隐私与范围

程序只读写自身用户设置（窗口坐标、缩放、静音、自启动），不包含 AI、网络、语音、账户、数据库、任务监听、终端监听或第三方应用集成。Working / Success / Error 素材已预留在角色包中，但第一版交互状态机仅主动使用 Idle、Happy、Sleep、Wake。

## 上游说明

工作目录开始时只有两张角色参考图，没有 Git 元数据或可读取的上游源码；公开检索也未能确认名为 “Desktop Pet Mitarashi” 的仓库。因此本版本采用 MIT 许可的全新最小 Electron 实现，没有复制或冒充未知上游代码。若后续提供准确仓库地址，可再核对并补充原项目版权声明。
