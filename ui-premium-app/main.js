const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Só uma instância aberta por vez: abrir de novo apenas foca a janela existente.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 420,
    minHeight: 520,
    title: 'UI Premium - Protótipo',
    backgroundColor: '#020208',
    icon: path.join(__dirname, 'build', 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Mostra a janela só depois de pronta, sem piscar branco.
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // A interface é local: bloqueia navegação e abertura de novas janelas.
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  if (!gotTheLock) return;
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
