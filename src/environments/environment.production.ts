// URL del backend en producción.
// Cuando Gustavo despliegue el backend, reemplazar BACKEND_URL con el dominio real.
// Ejemplo: si el dominio final es chinchononline.com y el backend corre en el mismo servidor:
//   apiUrl: '/api'   (Nginx/Cloudflare proxea /api → backend:3000)
// Si el backend está en un subdominio separado:
//   apiUrl: 'https://api.chinchononline.com/api'
export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: `wss://${typeof window !== 'undefined' ? window.location.host : ''}/ws`,
};
