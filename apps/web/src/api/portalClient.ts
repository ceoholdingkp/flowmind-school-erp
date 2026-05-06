import axios from 'axios';

const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'colegio_san_andres';

const portalApi = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  },
});

// Attach portal token to every request
portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('portal_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → redirect to portal login
portalApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_user');
      window.location.href = '/portal/login';
    }
    return Promise.reject(error);
  },
);

export default portalApi;
