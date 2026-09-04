const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

const DEV_URL = process.env.DESK_SUPPORT_DEV_URL || 'http://localhost:4000'

function createWindow() {
  const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: isDevelopment,
    },
  })

  if (isDevelopment) {
    void win.loadURL(DEV_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const startUrl = url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true,
    })
    void win.loadURL(startUrl)
  }

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`Desk-Support failed to load (${errorCode}): ${errorDescription}`)
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
