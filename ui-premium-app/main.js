const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const APP_ID = 'com.piticoalves.uipremium';

// Windows: usa o mesmo ID do build para a barra de tarefas reconhecer o app.
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

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

  // O .exe portátil roda a partir de uma cópia temporária que é apagada ao fechar.
  // Isto faz o "Fixar na barra de tarefas" apontar para o .exe que foi baixado.
  const portableExe = process.env.PORTABLE_EXECUTABLE_FILE;
  if (process.platform === 'win32' && portableExe) {
    mainWindow.setAppDetails({
      appId: APP_ID,
      appIconPath: portableExe,
      relaunchCommand: `"${portableExe}"`,
      relaunchDisplayName: 'UI Premium',
    });
  }

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
