import axios from 'axios';

const frappe = axios.create({
  baseURL: import.meta.env.VITE_FRAPPE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': getCsrfToken(),
  },
});

function getCsrfToken() {
  const match = document.cookie.match(/frappe_csrf_token=([^;]+)/);
  return match ? match[1] : '';
}

frappe.interceptors.request.use((config) => {
  config.headers['X-Frappe-CSRF-Token'] = getCsrfToken();
  return config;
});

frappe.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default frappe;

export const login = (usr, pwd) =>
  frappe.post('/api/method/login', { usr, pwd });

export const logout = () =>
  frappe.post('/api/method/logout');

export const getMe = () =>
  frappe.get('/api/method/frappe.auth.get_logged_user');

export const listDoc = (doctype, params = {}) =>
  frappe.get(`/api/resource/${doctype}`, { params });

export const getDoc = (doctype, name) =>
  frappe.get(`/api/resource/${doctype}/${name}`);

export const createDoc = (doctype, data) =>
  frappe.post(`/api/resource/${doctype}`, { data });

export const updateDoc = (doctype, name, data) =>
  frappe.put(`/api/resource/${doctype}/${name}`, { data });

export const deleteDoc = (doctype, name) =>
  frappe.delete(`/api/resource/${doctype}/${name}`);

export const callMethod = (method, args = {}) =>
  frappe.post(`/api/method/${method}`, args);
