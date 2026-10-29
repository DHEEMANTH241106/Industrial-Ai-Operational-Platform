import axios from 'axios';
import { Camera, Incident, AnalyticsSummary, ModelStatus, Zone, MonitoringSession, Organization, SafetyProfile } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: any) => {
    // Form data for OAuth2
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  getMe: () => api.get('/auth/me'),
  register: (data: any) => api.post('/auth/register', data),
};

export const organizationsApi = {
  list: () => api.get<Organization[]>('/organizations'),
  getCurrent: () => api.get<Organization>('/organizations/current'),
  getSafetyProfiles: (organizationId?: number) =>
    api.get<SafetyProfile[]>('/organizations/safety-profiles', { params: organizationId ? { organization_id: organizationId } : {} }),
  createSafetyProfile: (data: Partial<SafetyProfile>) => api.post<SafetyProfile>('/organizations/safety-profiles', data),
};

export const camerasApi = {
  list: () => api.get<Camera[]>('/cameras'),
  create: (data: Partial<Camera>) => api.post<Camera>('/cameras', data),
  get: (id: number) => api.get<Camera>(`/cameras/${id}`),
  update: (id: number, data: Partial<Camera>) => api.put<Camera>(`/cameras/${id}`, data),
  delete: (id: number) => api.delete(`/cameras/${id}`),
  test: (id: number) => api.post(`/cameras/${id}/test`),
};

export const zonesApi = {
  list: (cameraId?: number) => api.get<Zone[]>('/zones', { params: cameraId ? { camera_id: cameraId } : {} }),
  create: (data: Partial<Zone>) => api.post<Zone>('/zones', data),
  update: (id: number, data: Partial<Zone>) => api.put<Zone>(`/zones/${id}`, data),
  delete: (id: number) => api.delete(`/zones/${id}`),
};

export const sessionsApi = {
  list: (params?: any) => api.get<MonitoringSession[]>('/sessions', { params }),
  create: (data: Partial<MonitoringSession>) => api.post<MonitoringSession>('/sessions', data),
  get: (id: number) => api.get<MonitoringSession>(`/sessions/${id}`),
  stop: (id: number) => api.post(`/sessions/${id}/stop`),
  getMetrics: (id: number) => api.get(`/sessions/${id}/metrics`),
};

export const incidentsApi = {
  list: (params?: any) => api.get<Incident[]>('/incidents', { params }),
  get: (id: number) => api.get<Incident>(`/incidents/${id}`),
  update: (id: number, data: Partial<Incident>) => api.put<Incident>(`/incidents/${id}`, data),
  getEvidence: (id: number) => api.get(`/incidents/${id}/evidence`),
};

export const analyticsApi = {
  getSummary: () => api.get<AnalyticsSummary>('/analytics/summary'),
  getTrends: (params?: any) => api.get('/analytics/trends', { params }),
  getByType: (params?: any) => api.get('/analytics/by-type', { params }),
  getByCamera: (params?: any) => api.get('/analytics/by-camera', { params }),
};

export const modelsApi = {
  getStatus: () => api.get<ModelStatus>('/models/status'),
  getLabels: () => api.get('/models/labels'),
  reload: () => api.post('/models/reload'),
};

export const systemApi = {
  health: () => api.get('/health'),
};

export default api;
