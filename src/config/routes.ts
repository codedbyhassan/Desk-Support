// Route definitions
export const routes = {
  home: '/',
  login: '/login',
  signup: '/signup',
  verifyEmail: '/verify-email',
  dashboard: '/dashboard',
  tickets: '/tickets',
  assets: '/assets',
  teams: '/teams',
  call: '/teams/call/:roomId',
  settings: '/settings',
  workingArea: '/working-area',
} as const;
