const { app, BrowserWindow, Tray, Menu, Notification, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

let mainWindow = null;
let tray = null;
let breakTimer = null;
let timeRemaining = 30 * 60 * 1000;
let initialTime = 30 * 60 * 1000;
let breakDuration = 20;
let isPaused = false;
let isMinimized = false;
let isQuitting = false;
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (config.breakInterval) {
        initialTime = config.breakInterval * 60 * 1000;
        timeRemaining = initialTime;
      }
      if (config.breakDuration) breakDuration = config.breakDuration;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

function saveConfig() {
  try {
    const config = {
      breakInterval: initialTime / 60000,
      breakDuration: breakDuration,
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

loadConfig();

const autoLauncher = new AutoLaunch({
  name: 'Eye Break Reminder',
  isHidden: true,
});

autoLauncher.enable().catch(err => {
  console.error('Auto-launch failed:', err);
});

function createMainWindow() {
  const iconPath = path.join(__dirname, 'icon.png');
  
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    minWidth: 400,
    minHeight: 350,
    show: false,
    resizable: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Set the icon explicitly after window creation
  mainWindow.setIcon(iconPath);

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (e) => {
    if (!isQuitting && process.platform !== 'darwin') {
      e.preventDefault();
      mainWindow.hide();
      isMinimized = true;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  
  // Ensure icon exists before creating tray
  if (!fs.existsSync(iconPath)) {
    console.error('Icon file not found at:', iconPath);
    return;
  }
  
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Eye Break App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },
    },
    {
      label: 'Reset Timer',
      click: () => {
        resetTimer();
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        saveConfig();
        
        // Clear the break timer
        if (breakTimer) {
          clearInterval(breakTimer);
          breakTimer = null;
        }
        
        // Destroy the main window if it exists
        if (mainWindow) {
          mainWindow.removeAllListeners('close');
          mainWindow.destroy();
          mainWindow = null;
        }
        
        // Remove the tray
        if (tray) {
          tray.destroy();
          tray = null;
        }
        
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Eye Break Reminder - Next break in ' + formatTime(timeRemaining));
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

function startBreakTimer() {
  if (breakTimer) {
    clearInterval(breakTimer);
  }

  breakTimer = setInterval(() => {
    if (!isPaused) {
      timeRemaining -= 1000;

      // Update tray tooltip with remaining time
      if (tray) {
        tray.setToolTip('Eye Break Reminder - Next break in ' + formatTime(timeRemaining));
      }

      // Send timer update to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('timer-update', timeRemaining);
      }

      if (timeRemaining <= 0) {
        clearInterval(breakTimer);
        openBreakWindow();
      }
    }
  }, 1000);
}

function openBreakWindow() {
  if (mainWindow) {
    if (isMinimized) {
      mainWindow.show();
      isMinimized = false;
    }
    mainWindow.focus();
    mainWindow.webContents.send('break-time', {
      message: 'Time to rest your eyes!',
      instruction: 'Look at something 20 feet away for 20 seconds',
      duration: breakDuration,
    });
  }
}

function resetTimer() {
  timeRemaining = initialTime;
  isPaused = false;
  startBreakTimer();
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-reset');
  }
  
  if (tray) {
    tray.setToolTip(`Eye Break Reminder - Timer reset! Next break in ${Math.round(initialTime / 60000)}:00`);
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// IPC handlers
ipcMain.on('pause-timer', () => {
  isPaused = true;
});

ipcMain.on('resume-timer', () => {
  isPaused = false;
});

ipcMain.on('reset-timer', () => {
  resetTimer();
});

ipcMain.on('timer-break-complete', () => {
  timeRemaining = initialTime;
  startBreakTimer();
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-reset');
  }
});

ipcMain.on('update-timer-setting', (event, { interval, duration }) => {
  initialTime = interval * 60 * 1000;
  timeRemaining = initialTime;
  breakDuration = duration;
  saveConfig();
  startBreakTimer();
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-updated', { interval, duration });
  }
});

ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
    isMinimized = true;
  }
});

ipcMain.on('quit-app', () => {
  isQuitting = true;
  saveConfig();
  
  // Clear the break timer
  if (breakTimer) {
    clearInterval(breakTimer);
    breakTimer = null;
  }
  
  // Destroy the main window if it exists
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
    mainWindow.destroy();
    mainWindow = null;
  }
  
  // Remove the tray
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  app.quit();
});

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  startBreakTimer();

  setTimeout(() => {
    if (mainWindow) {
      mainWindow.show();
    }
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  saveConfig();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
