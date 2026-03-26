import axios from 'axios';

// ✅ Backend URL (Render)
const API_URL = "https://grievanceportal-8gew.onrender.com";

// ✅ Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('grs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Handle unauthorized (auto logout)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('grs_token');
      localStorage.removeItem('grs_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ✅ AUTH APIs (FIXED: added /api)
export const authAPI = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),
  register: (data) =>
    api.post('/api/auth/register', data),
};

// ✅ COMPLAINT APIs (FIXED: added /api)
export const complaintsAPI = {
  getAll: () => api.get('/api/complaints'),
  getOne: (id) => api.get(`/api/complaints/${id}`),
  submit: (data) => api.post('/api/complaints', data),
  assign: (id, dept) =>
    api.patch(`/api/complaints/${id}/assign`, { dept }),
  updateStatus: (id, status, remarks) =>
    api.patch(`/api/complaints/${id}/status`, { status, remarks }),
};

// ✅ NOTIFICATIONS APIs (FIXED: added /api)
export const notificationsAPI = {
  getAll: () => api.get('/api/notifications'),
  markRead: () => api.patch('/api/notifications/read'),
};

export default api;