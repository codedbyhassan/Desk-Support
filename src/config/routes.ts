// Route definitions
export const routes = {
  home: '/',
  dashboard: '/dashboard',
  tickets: '/tickets',
  assets: '/assets',
  teams: '/teams',
  call: '/teams/call/:roomId',
  settings: '/settings',
} as const;
