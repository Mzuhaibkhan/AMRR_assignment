import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, bulkUpdateTasks, bulkDeleteTasks } from './api';
import type { TaskWithSubtasks, TaskStatus, TaskCreate, Task } from './types';
import { TaskStatusValues } from './types';
import { Plus, Check, Loader2, ListTodo, Trash2, Edit2, Play, Circle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<TaskCreate>({ title: '', description: '', links: '', status: TaskStatusValues.PENDING });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [parentTaskId, setParentTaskId] = useState<number | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTasks(newSelection);
  };

  const isSelected = (id: number) => selectedTasks.has(id);

  const handleBulkStatusChange = async (status: TaskStatus) => {
    if (selectedTasks.size === 0) return;
    try {
      await bulkUpdateTasks(Array.from(selectedTasks), status);
      setSelectedTasks(new Set());
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    try {
      await bulkDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const onSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTask(editingId, { title: formData.title, description: formData.description, links: formData.links, status: formData.status });
      } else {
        await createTask({ ...formData, parent_id: parentTaskId || undefined });
      }
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setParentTaskId(null);
    setFormData({ title: '', description: '', links: '', status: TaskStatusValues.PENDING });
  };

  const openEditModal = (task: Task) => {
    setEditingId(task.id);
    setParentTaskId(task.parent_id);
    setFormData({ title: task.title, description: task.description || '', links: task.links || '', status: task.status });
    setShowModal(true);
  };

  const openCreateModal = (parentId: number | null = null) => {
    resetForm();
    setParentTaskId(parentId);
    setShowModal(true);
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatusValues.COMPLETED: return <CheckCircle2 size={18} className="text-success" />;
      case TaskStatusValues.IN_PROGRESS: return <Play size={18} className="text-primary-color" />;
      default: return <Circle size={18} className="text-warning" />;
    }
  };

  const renderTask = (task: TaskWithSubtasks | Task, isSubtask = false) => {
    return (
      <div key={task.id} className="task-wrapper">
        <div className={`glass-panel task-item ${isSubtask ? 'subtask-item' : ''}`} style={{ marginBottom: isSubtask ? '0.5rem' : '1rem' }}>
          <div className="task-item-header">
            <input 
              type="checkbox" 
              className="custom-checkbox"
              checked={isSelected(task.id)}
              onChange={() => toggleSelection(task.id)}
            />
            <div className="task-content" onClick={() => !isSubtask && toggleSelection(task.id)}>
              <div className={`task-title ${task.status === TaskStatusValues.COMPLETED ? 'completed' : ''}`}>
                {getStatusIcon(task.status)}
                {task.title}
              </div>
              {task.description && <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem', marginLeft: '1.5rem' }}>{task.description}</p>}
              {task.links && (
                <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  <a href={task.links.startsWith('http') ? task.links : `http://${task.links}`} target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>
                    {task.links}
                  </a>
                </div>
              )}
            </div>
            
            <div className="task-actions">
              <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '')}`}>
                {task.status}
              </span>
              {!isSubtask && (
                <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={(e) => { e.stopPropagation(); openCreateModal(task.id); }} title="Add Subtask">
                  <Plus size={16} />
                </button>
              )}
              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={(e) => { e.stopPropagation(); openEditModal(task as Task); }} title="Edit">
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Render Subtasks if any */}
        {!isSubtask && 'subtasks' in task && task.subtasks?.length > 0 && (
          <div className="subtasks-container">
            {task.subtasks.map(sub => renderTask(sub, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ListTodo size={32} />
            Orbit Tasks
          </h1>
          <p className="text-muted">Manage your tasks across multiple workflows.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openCreateModal(null)}>
          <Plus size={18} /> New Task
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin text-primary-color" size={32} />
        </div>
      ) : (
        <div className="task-list">
          {tasks.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No tasks yet. Create one to get started!
            </div>
          ) : (
            tasks.map(t => renderTask(t))
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      <div className={`glass-panel bulk-action-bar ${selectedTasks.size > 0 ? 'visible' : ''}`}>
        <span className="bulk-selected-count">{selectedTasks.size} selected</span>
        <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => handleBulkStatusChange(TaskStatusValues.COMPLETED)}>
            <Check size={16} /> Complete
          </button>
          <button className="btn btn-ghost" onClick={() => handleBulkStatusChange(TaskStatusValues.IN_PROGRESS)}>
            <Play size={16} /> In Progress
          </button>
          <button className="btn btn-ghost" onClick={() => handleBulkStatusChange(TaskStatusValues.PENDING)}>
            <Circle size={16} /> Pending
          </button>
          <button className="btn btn-danger" onClick={handleBulkDelete}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit Task' : (parentTaskId ? 'Add Subtask' : 'Create Task')}</h2>
            <form onSubmit={onSaveTask}>
              <div className="input-group">
                <label className="input-label">Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  autoFocus
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What needs to be done?" 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Description (Optional)</label>
                <textarea 
                  className="form-textarea" 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details..." 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Reference Link (Optional)</label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={formData.links || ''}
                  onChange={e => setFormData({ ...formData, links: e.target.value })}
                  placeholder="https://example.com" 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select 
                  className="form-select"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                >
                  <option value={TaskStatusValues.PENDING}>Pending</option>
                  <option value={TaskStatusValues.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatusValues.COMPLETED}>Completed</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
