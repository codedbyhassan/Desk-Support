import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'desksupport.com',
  appName: 'DeskSupport Pro',
  webDir: 'dist',
  
  // ✅ Configure to use live server instead of local build
  server: {
    // Point to your local network server (change IP if needed)
    url: 'http://172.20.10.2:4000',
    // Allow cleartext HTTP (not HTTPS) for development
    cleartext: true,
  },
  
  // Allow camera and other plugins
  plugins: {
    Camera: {
      permissions: ['camera'],
    },
  },
};

export default config;
