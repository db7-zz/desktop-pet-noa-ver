const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petApi', {
  bootstrap: () => ipcRenderer.invoke('get-bootstrap'),
  passthrough: ignore => ipcRenderer.send('mouse-passthrough', ignore),
  drag: (phase, point) => ipcRenderer.send('window-drag', phase, point),
  contextMenu: () => ipcRenderer.send('show-context-menu'),
  onSettings: callback => ipcRenderer.on('settings-changed', (_event, value) => callback(value))
});
