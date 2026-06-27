// Reemplazar RAILWAY_URL con la URL real una vez desplegado el backend
const RAILWAY_URL = 'https://RAILWAY_URL_AQUI.up.railway.app';

export const environment = {
  production: true,
  apiUrl: `${RAILWAY_URL}/api`,
  wsUrl: `${RAILWAY_URL.replace('https://', 'wss://')}/ws`,
};
