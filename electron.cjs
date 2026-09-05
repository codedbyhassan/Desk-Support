const { app, BrowserWindow, session } = require('electron')
const path = require('path')
const url = require('url')
const DEV_URL = process.env.DESK_SUPPORT_DEV_URL || 'http://localhost:4000'
function isAllowedUrl(target){try{const parsed=new URL(target);if(parsed.protocol==='file:')return true;if(process.env.NODE_ENV==='development'&&!app.isPackaged)return parsed.origin===new URL(DEV_URL).origin;return parsed.protocol==='https:'&&parsed.hostname.endsWith('.supabase.co')}catch{return false}}
function createWindow(){
 const isDevelopment=process.env.NODE_ENV==='development'||!app.isPackaged
 const win=new BrowserWindow({width:1280,height:840,minWidth:1024,minHeight:700,show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:isDevelopment,allowRunningInsecureContent:false}})
 win.once('ready-to-show',()=>win.show())
 win.webContents.setWindowOpenHandler(({url:target})=>{if(isAllowedUrl(target))return{action:'allow'};return{action:'deny'}})
 win.webContents.on('will-navigate',(event,target)=>{if(!isAllowedUrl(target))event.preventDefault()})
 if(isDevelopment){void win.loadURL(DEV_URL);win.webContents.openDevTools({mode:'detach'})}else{const startUrl=url.format({pathname:path.join(__dirname,'dist/index.html'),protocol:'file:',slashes:true});void win.loadURL(startUrl)}
 win.webContents.on('did-fail-load',(_event,errorCode,errorDescription)=>console.error(`Desk-Support failed to load (${errorCode}): ${errorDescription}`))
}
app.whenReady().then(()=>{session.defaultSession.setPermissionRequestHandler((_webContents,permission,callback)=>{callback(['media','notifications'].includes(permission))});createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})})
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})
