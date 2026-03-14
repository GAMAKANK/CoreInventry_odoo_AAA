import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ci_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ci_token');
      localStorage.removeItem('ci_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Typed API functions ───────────────────────────────────────────────────────

export const authApi = {
  login:    (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: object) => api.post('/auth/register', data),
  me:       () => api.get('/auth/me'),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const productApi = {
  list:   (params?: object) => api.get('/products', { params }),
  get:    (id: string)      => api.get(`/products/${id}`),
  create: (data: object)    => api.post('/products', data),
  update: (id: string, data: object) => api.put(`/products/${id}`, data),
  delete: (id: string)      => api.delete(`/products/${id}`),
};

export const categoryApi = {
  list:   ()               => api.get('/categories'),
  create: (data: object)   => api.post('/categories', data),
  update: (id: string, data: object) => api.put(`/categories/${id}`, data),
};

export const warehouseApi = {
  list:   ()               => api.get('/warehouses'),
  get:    (id: string)     => api.get(`/warehouses/${id}`),
  create: (data: object)   => api.post('/warehouses', data),
  update: (id: string, data: object) => api.put(`/warehouses/${id}`, data),
};

export const locationApi = {
  list:   (params?: object) => api.get('/locations', { params }),
  create: (data: object)    => api.post('/locations', data),
};

export const receiptApi = {
  list:    (params?: object) => api.get('/receipts', { params }),
  get:     (id: string)      => api.get(`/receipts/${id}`),
  create:  (data: object)    => api.post('/receipts', data),
  confirm: (id: string)      => api.post(`/receipts/${id}/confirm`),
  cancel:  (id: string)      => api.post(`/receipts/${id}/cancel`),
};

export const deliveryApi = {
  list:    (params?: object) => api.get('/deliveries', { params }),
  get:     (id: string)      => api.get(`/deliveries/${id}`),
  create:  (data: object)    => api.post('/deliveries', data),
  confirm: (id: string)      => api.post(`/deliveries/${id}/confirm`),
  cancel:  (id: string)      => api.post(`/deliveries/${id}/cancel`),
};

export const transferApi = {
  list:    (params?: object) => api.get('/transfers', { params }),
  get:     (id: string)      => api.get(`/transfers/${id}`),
  create:  (data: object)    => api.post('/transfers', data),
  confirm: (id: string)      => api.post(`/transfers/${id}/confirm`),
  cancel:  (id: string)      => api.post(`/transfers/${id}/cancel`),
};

export const adjustmentApi = {
  list:    (params?: object) => api.get('/adjustments', { params }),
  get:     (id: string)      => api.get(`/adjustments/${id}`),
  create:  (data: object)    => api.post('/adjustments', data),
  confirm: (id: string)      => api.post(`/adjustments/${id}/confirm`),
  cancel:  (id: string)      => api.post(`/adjustments/${id}/cancel`),
};

export const stockApi = {
  levels:    (params?: object) => api.get('/stock/levels', { params }),
  movements: (params?: object) => api.get('/stock/movements', { params }),
};
