# AGENTS.md

## 项目定位

“诺哥桌宠”是独立、纯本地的 Windows x64 Electron 桌宠，最终交付为单文件便携版 EXE。项目不联网，不读取或监听 Codex/其他应用状态，也不包含 AI、账户、数据库、任务或终端集成。除非用户明确改变范围，不要引入这些能力。

- 包名：`nuoge-desktop-pet`
- 版本：`1.0.0`
- 许可证：MIT
- 默认分支：`main`
- 远程仓库：`https://github.com/db7-zz/desktop-pet-noa-ver.git`

## 技术与关键文件

- `src/main.js`：Electron 主进程；透明置顶窗口、托盘、菜单、位置、自启动、拖拽 IPC。
- `src/preload.js`：最小化 IPC 桥；保持 `contextIsolation: true`、`nodeIntegration: false`。
- `src/config.js`：设置校验、损坏回退和原子保存。
- `src/renderer/renderer.js`：Canvas 动画状态机、交互、透明像素命中与缩放。
- `assets/nuoge/config.json`：窗口、透明阈值、帧率、循环和帧路径。
- `scripts/process-assets.py`：将透明四帧横条整理为运行时 PNG 帧，需要 Pillow。
- `test/config.test.js`：配置容错测试。
- `package.json`：Electron 启动和 electron-builder 便携版配置。
- `README.md`：普通用户说明；不要在本文件重复。

## 核心架构约束

1. 主进程创建透明、无边框、置顶、无阴影、跳过任务栏的固定窗口。
2. 窗口关闭时隐藏到托盘；只有菜单“退出”才结束进程。
3. 原生窗口固定为最大画布 `300×350`（基础 `240×280` × `1.25`）。缩放只改变 Canvas 内角色本体，勿改回动态调整 `BrowserWindow`，否则 Windows/DPI 环境可能出现缩放失效或拖拽拉伸。
4. 鼠标位于透明像素时，通过 `setIgnoreMouseEvents(..., {forward:true})` 穿透；可见像素 alpha 阈值当前为 `24`。
5. Canvas 内部坐标乘 `devicePixelRatio`；修改绘制时同步检查 alpha 命中坐标。
6. IPC 仅开放 `bootstrap`、`passthrough`、`drag`、`contextMenu`、`onSettings`，不要向渲染进程暴露任意文件或 shell 权限。

## 交互与动画

- 单击角色：`happy`，结束回 `idle`。
- 双击角色：切换 `sleep` / `wake`。
- 移动超过 5 屏幕像素：拖动窗口；拖拽不得触发单击。
- 按住期间冻结动画帧，防止轮廓变化看起来像拉伸。
- 右键角色：打开与托盘共用的原生菜单。
- `idle` 与 `idle_b` 自动交替。

动画由 `assets/nuoge/config.json` 配置 `fps`、`loop`、`frames`、`next`。不存在的状态或加载失败的帧应回退 `idle`，不要移除容错。

当前状态均为 4 帧透明 PNG：

| 状态 | FPS | 用途 |
|---|---:|---|
| `idle` / `idle_b` | 3 | 两套待机循环 |
| `happy` | 6 | 单击互动 |
| `sleep` | 2 | 睡觉循环 |
| `wake` | 6 | 唤醒过渡 |
| `working` | 4 | 素材已存在，尚无入口 |
| `success` | 5 | 素材已存在，尚无入口 |
| `error` | 3 | 素材已存在，尚无入口 |

## 角色资源规范

帧路径：`assets/nuoge/<state>/frame-01.png` 起连续编号。每帧为 `240×280` RGBA PNG、底部居中，使用最近邻缩放。

角色外观必须保持：黑紫双色长发、银色角饰、哥特黑衣、金属项圈链条、小尖牙、黑色长靴、Q 版精致像素风、黑灰紫配色，以及慵懒冷淡又危险可爱的“大姐姐”气质。参考图为：

- `character_apearance.png`（文件名拼写沿用现状）
- `character_reference_sheet.png`

不要改成普通插画、3D、写实或非像素风。图片处理脚本只保留最大 alpha 连通区域，可能误删不与角色相连的合法特效；添加悬浮元素时需特别检查。

## 设置与菜单

设置保存于 Electron `userData/settings.json`，字段：

- `scale`：`small` / `medium` / `large`，比例 `0.75` / `1` / `1.25`
- `muted`：目前只有入口，无音频实现
- `autoStart`：便携版优先使用 `PORTABLE_EXECUTABLE_FILE`
- `position`：整数坐标；离开所有显示器时回到主屏幕右下角

配置缺失或损坏必须恢复默认值。菜单包含显示/隐藏、三档缩放、静音、自启动、重置位置和退出。托盘使用 `assets/nuoge/icon.png`；安装包暂未配置 `.ico`，仍显示默认 Electron 应用图标。

## 开发与验证

```powershell
pnpm install          # 或 npm install
npm start
npm test
npm run dist
```

便携版输出：`release/Nuoge-Desktop-Pet-1.0.0-portable.exe`。

修改后至少执行：

```powershell
node --check src/main.js
node --check src/preload.js
node --check src/renderer/renderer.js
npm test
```

涉及 Electron、路径、资源或打包配置时还需运行 `npm run dist`，并真机验证：透明置顶、点击穿透、拖拽不拉伸/不触发 happy、三档缩放、单击/双击/右键、托盘恢复、退出和设置恢复。

## 已知限制与维护提醒

- 仅直接支持 PNG 序列；GIF/WebP 动图尚未接入。
- `working`、`success`、`error` 未连接用户交互。
- 静音尚无实际音频对象。
- 角色路径固定为 `assets/nuoge/`，没有角色选择界面。
- 没有单实例锁，重复启动可能出现多个桌宠。
- 窗口移动时同步写设置；复杂化后应加防抖。
- 中文文件保持 UTF-8；PowerShell 旧终端显示乱码不代表文件损坏。

## Git 规则

不要提交 `node_modules/`、`.pnpm-store/`、`release/`、`dist/`、`.work/`、日志或无关个人文件。角色成品帧和两张设计图属于项目内容。提交前检查 `git status`。

当前机器的 Git 代理可能指向失效的 `127.0.0.1`；需要时只对单次推送绕过，不修改全局配置：

```powershell
git -c http.proxy= -c https.proxy= push origin main
```
