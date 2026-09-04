import type { CapacitorConfig } from '@capacitor/cli'

const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.desksupport.pro',
  appName: 'DeskSupport Pro',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
          androidScheme: 'https',
          iosScheme: 'https',
        },
      }
    : {}),
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
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
}

export default config
