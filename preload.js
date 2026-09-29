const { contextBridge, ipcRenderer } = require('electron');

// Only these window controls are shared with the page; the page itself has no Node.js access.
contextBridge.exposeInMainWorld('windowControls', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    getPosition: () => ipcRenderer.sendSync('window-get-position-sync'),
    setPosition: (x, y) => ipcRenderer.send('window-set-position', x, y),
});
