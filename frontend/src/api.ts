import axios from 'axios';
import type { Task, TaskCreate, TaskUpdate, TaskWithSubtasks, TaskStatus } from './types';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
});

export const getTasks = async (): Promise<TaskWithSubtasks[]> => {
  const response = await api.get('/tasks');
  return response.data;
};

export const createTask = async (task: TaskCreate): Promise<Task> => {
  const response = await api.post('/tasks', task);
  return response.data;
};

export const updateTask = async (id: number, task: TaskUpdate): Promise<Task> => {
  const response = await api.put(`/tasks/${id}`, task);
  return response.data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

export const bulkUpdateTasks = async (task_ids: number[], status: TaskStatus): Promise<Task[]> => {
  const response = await api.put('/tasks/bulk/update', { task_ids, status });
  return response.data;
};

export const bulkDeleteTasks = async (task_ids: number[]): Promise<void> => {
  await api.post('/tasks/bulk/delete', { task_ids });
};
