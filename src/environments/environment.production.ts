const RAILWAY_URL = 'https://backend-production-0e39.up.railway.app';

export const environment = {
  production: true,
  apiUrl: `${RAILWAY_URL}/api`,
  wsUrl: `${RAILWAY_URL.replace('https://', 'wss://')}/ws`,
};
