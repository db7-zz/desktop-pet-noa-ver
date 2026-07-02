const { app, BrowserWindow, Menu, Tray, ipcMain, screen, nativeImage } = require('electron');
const path = require('node:path');
const { SCALES, loadSettings, saveSettings, loadCharacterConfig } = require('./config');

let win;
let tray;
let quitting = false;
let settings;
let dragOrigin;
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const characterFile = path.join(__dirname, '..', 'assets', 'nuoge', 'config.json');
const character = loadCharacterConfig(characterFile);

function scaledSize() {
  // Keep a stable transparent host window. The renderer scales only the visible sprite,
  // avoiding Windows/DPI-dependent BrowserWindow resizing glitches while dragging.
  const factor = Math.max(...Object.values(SCALES));
  return { width: Math.round(character.window.width * factor), height: Math.round(character.window.height * factor) };
}

function defaultPosition(size = scaledSize()) {
  const area = screen.getPrimaryDisplay().workArea;
  const margin = Number(character.window.margin) || 24;
  return { x: area.x + area.width - size.width - margin, y: area.y + area.height - size.height - margin };
}

function ensureVisible(position, size) {
  const displays = screen.getAllDisplays();
  const valid = position && displays.some(({ workArea: a }) =>
    position.x < a.x + a.width - 20 && position.x + size.width > a.x + 20 &&
    position.y < a.y + a.height - 20 && position.y + size.height > a.y + 20);
  return valid ? position : defaultPosition(size);
}

function persist() { settings = saveSettings(settingsFile(), settings); }

function setScale(scale) {
  if (!Object.hasOwn(SCALES, scale)) return;
  settings.scale = scale;
  persist();
  win.webContents.send('settings-changed', settings);
  rebuildMenus();
}

function resetPosition() {
  const position = defaultPosition();
  win.setPosition(position.x, position.y);
  settings.position = position;
  persist();
}

function setAutoStart(enabled) {
  settings.autoStart = Boolean(enabled);
  // Portable builds expose the stable .exe path here; process.execPath may point at a temporary unpack folder.
  const launchPath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  app.setLoginItemSettings({ openAtLogin: settings.autoStart, path: launchPath });
  persist();
  rebuildMenus();
}

function menuTemplate() {
  return [
    { label: win?.isVisible() ? '隐藏桌宠' : '显示桌宠', click: () => win.isVisible() ? win.hide() : win.show() },
    { type: 'separator' },
    { label: '缩放', submenu: ['small', 'medium', 'large'].map((key, index) => ({
      label: ['小', '中', '大'][index], type: 'radio', checked: settings.scale === key, click: () => setScale(key)
    })) },
    { label: '静音', type: 'checkbox', checked: settings.muted, click: ({ checked }) => { settings.muted = checked; persist(); rebuildMenus(); } },
    { label: '开机自启动', type: 'checkbox', checked: settings.autoStart, click: ({ checked }) => setAutoStart(checked) },
    { label: '重置到右下角', click: resetPosition },
    { type: 'separator' },
    { label: '退出', click: () => { quitting = true; app.quit(); } }
  ];
}

function rebuildMenus() {
  if (!win) return;
  const menu = Menu.buildFromTemplate(menuTemplate());
  tray?.setContextMenu(menu);
  win.webContents.send('context-menu-ready');
}

function createWindow() {
  settings = loadSettings(settingsFile());
  const size = scaledSize();
  const position = ensureVisible(settings.position, size);
  win = new BrowserWindow({
    ...size, ...position,
    transparent: true, frame: false, resizable: false, show: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  // Transparent, frameless and floating are the three native-window properties that make this a desktop pet.
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.showInactive());
  win.on('close', event => { if (!quitting) { event.preventDefault(); win.hide(); } });
  win.on('move', () => {
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    settings.position = { x, y };
    persist();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'nuoge', 'icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) icon = nativeImage.createEmpty();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('诺哥桌宠');
  tray.on('click', () => win.isVisible() ? win.hide() : win.show());
  rebuildMenus();
}

ipcMain.handle('get-bootstrap', () => ({ settings, character }));
ipcMain.on('mouse-passthrough', (_event, ignore) => win?.setIgnoreMouseEvents(Boolean(ignore), { forward: true }));
// Renderer checks the current frame's alpha; transparent pixels are passed through to the app underneath.
ipcMain.on('show-context-menu', () => Menu.buildFromTemplate(menuTemplate()).popup({ window: win }));
ipcMain.on('window-drag', (_event, phase, point) => {
  if (!win || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  if (phase === 'start') {
    const [x, y] = win.getPosition();
    dragOrigin = { cursorX: point.x, cursorY: point.y, windowX: x, windowY: y };
  } else if (phase === 'move' && dragOrigin) {
    win.setPosition(
      Math.round(dragOrigin.windowX + point.x - dragOrigin.cursorX),
      Math.round(dragOrigin.windowY + point.y - dragOrigin.cursorY)
    );
  } else if (phase === 'end') dragOrigin = null;
});

app.whenReady().then(() => { createWindow(); createTray(); });
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', event => event?.preventDefault?.());
