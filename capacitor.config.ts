import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.desksupport.pro',
  appName: 'DeskSupport Pro',
  webDir: 'dist',
  
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // 🔧 DEVELOPMENT MODE: Comment out these lines for production build
    url: 'http://172.20.10.2:4000',
    cleartext: true,
    // 📝 For production, comment out url and cleartext above
  },
  
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    limitsNavigationsToAppBoundDomains: false,
  },
  
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
  },
  
  plugins: {
    Camera: {
      permissions: ['camera'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;