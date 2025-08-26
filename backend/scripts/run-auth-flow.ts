import 'dotenv/config';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
import { buildServer } from '../src/index';

(async () => {
  try {
    const server = await buildServer();
    console.log('server built');
    const email = `manual_${Date.now()}@example.com`;
    const password = 'SuperSecurePass123!';
    console.log('registering', email);
    const reg = await server.inject({ method: 'POST', url: '/auth/register', payload: { email, password, displayName: 'Manual' } });
    console.log('register status', reg.statusCode, reg.body);
    const login = await server.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
    console.log('login status', login.statusCode, login.body);
    const tokens = JSON.parse(reg.body).tokens;
    const refresh = await server.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: tokens.refresh } });
    console.log('refresh status', refresh.statusCode, refresh.body);
    const logout = await server.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken: tokens.refresh } });
    console.log('logout status', logout.statusCode, logout.body);
    await server.close?.();
    process.exit(0);
  } catch (err) {
    console.error('error in run-auth-flow:', err && (err.stack || err));
    process.exit(1);
  }
})();
