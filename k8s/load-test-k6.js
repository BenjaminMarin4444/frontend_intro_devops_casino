import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Rampa de subida a 20 usuarios virtuales (VUs)
    { duration: '1m', target: 50 },   // Carga: subida a 50 VUs
    { duration: '1m', target: 100 },  // Estrés: subida a 100 VUs
    { duration: '1m', target: 100 },  // Mantener 100 VUs
    { duration: '30s', target: 0 },   // Rampa de bajada
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Tasa de error menor al 1% (exigencia del examen)
    http_req_duration: ['p(95)<200'], // Latencia p95 menor a 200ms (exigencia del examen)
  },
};

// URL objetivo (se puede inyectar mediante variable de entorno TARGET_URL, ej: k6 run -e TARGET_URL=http://elb-dns.com load-test-k6.js)
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4200';

export default function () {
  // 1. Simular carga visitando la página principal
  let resLobby = http.get(`${BASE_URL}/`);
  check(resLobby, {
    'lobby cargado exitosamente': (r) => r.status === 200,
  });
  sleep(1);

  // 2. Simular llamadas a la API del casino core
  let resJuegos = http.get(`${BASE_URL}/api/juegos`);
  check(resJuegos, {
    'lista de juegos obtenida': (r) => r.status === 200 || r.status === 401,
  });
  sleep(1);

  // 3. Simular consulta al microservicio de bonos (enrutada por Nginx)
  let resBonos = http.get(`${BASE_URL}/api/bonos`);
  check(resBonos, {
    'lista de bonos obtenida': (r) => r.status === 200 || r.status === 401,
  });
  sleep(2);
}
