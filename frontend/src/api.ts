import axios from 'axios';
import type { Task, TaskCreate, TaskUpdate, TaskWithSubtasks, TaskStatus, UserSettings } from './types';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are not already on the root or login flow, trigger a reload to reset State
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const getTasks = async (): Promise<TaskWithSubtasks[]> => {
  const response = await api.get('/tasks');
  return response.data;
};

export const createTask = async (task: TaskCreate): Promise<Task> => {
  const response = await api.post('/tasks', task);
  return response.data;
};

export const updateTask = async (id: string, task: TaskUpdate): Promise<Task> => {
  const response = await api.put(`/tasks/${id}`, task);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

export const bulkUpdateTasks = async (task_ids: string[], status: TaskStatus): Promise<Task[]> => {
  const response = await api.put('/tasks/bulk/update', { task_ids, status });
  return response.data;
};

export const bulkDeleteTasks = async (task_ids: string[]): Promise<void> => {
  await api.post('/tasks/bulk/delete', { task_ids });
};

export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await api.get('/user/settings');
  return response.data;
};

export const updateUserSettings = async (settings: UserSettings): Promise<UserSettings> => {
  const response = await api.put('/user/settings', settings);
  return response.data;
};
