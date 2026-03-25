import axios from 'axios';

const api = axios.create({
  baseURL:'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('grs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('grs_token');
      localStorage.removeItem('grs_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
};

export const complaintsAPI = {
  getAll: () => api.get('/complaints'),
  getOne: (id) => api.get(`/complaints/${id}`),
  submit: (data) => api.post('/complaints', data),
  assign: (id, dept) => api.patch(`/complaints/${id}/assign`, { dept }),
  updateStatus: (id, status, remarks) => api.patch(`/complaints/${id}/status`, { status, remarks }),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: () => api.patch('/notifications/read'),
};

export default api;
