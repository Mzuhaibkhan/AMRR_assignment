import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, bulkUpdateTasks, bulkDeleteTasks, getUserSettings, updateUserSettings } from './api';
import type { TaskWithSubtasks, TaskStatus, TaskPriority, TaskCreate, Task, UserSettings } from './types';
import { TaskStatusValues, TaskPriorityValues } from './types';
import { Plus, Check, Loader2, ListTodo, Trash2, Edit2, Play, Circle, CheckCircle2, Clock, LogOut, Settings, Search, ArrowUpDown } from 'lucide-react';

const priorityWeight = {
  [TaskPriorityValues.HIGH]: 3,
  [TaskPriorityValues.MEDIUM]: 2,
  [TaskPriorityValues.LOW]: 1,
};

export default function App() {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Authentication State
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<{ email: string; name?: string; picture?: string } | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );

  // User Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>({ wants_reminders: true });
  const [showSettings, setShowSettings] = useState(false);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<TaskCreate>({ 
    title: '', 
    description: '', 
    links: '', 
    status: TaskStatusValues.PENDING,
    priority: TaskPriorityValues.MEDIUM,
    deadline: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [deadlineFilter, setDeadlineFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'created_at'>('created_at');

  // Google Login Initialization
  useEffect(() => {
    if (token) return;
    
    let intervalId: any;
    
    const initGoogle = () => {
      if (window.google) {
        clearInterval(intervalId);
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1097839352726-pb48vmoer4h5eafv6lbfqsk94p632128.apps.googleusercontent.com',
          callback: (response: any) => {
            const idToken = response.credential;
            try {
              const payload = JSON.parse(atob(idToken.split('.')[1]));
              const email = payload.email;
              const name = payload.name;
              const picture = payload.picture;
              
              setToken(idToken);
              setUser({ email, name, picture });
              localStorage.setItem("token", idToken);
              localStorage.setItem("user", JSON.stringify({ email, name, picture }));
            } catch (err) {
              console.error("Failed to decode credential token", err);
            }
          }
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-login-btn"),
          { theme: "outline", size: "large" }
        );
      }
    };
    
    if (window.google) {
      initGoogle();
    } else {
      intervalId = setInterval(initGoogle, 500);
    }
    
    return () => clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchUserSettings();
    }
  }, [token]);

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

  const fetchUserSettings = async () => {
    try {
      const data = await getUserSettings();
      setUserSettings(data);
    } catch (e) {
      console.error("Failed to load user settings", e);
    }
  };

  const handleToggleReminders = async (wants: boolean) => {
    try {
      const updated = await updateUserSettings({ wants_reminders: wants });
      setUserSettings(updated);
    } catch (e) {
      console.error("Failed to update user settings", e);
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setTasks([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.google?.accounts.id.disableAutoSelect();
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTasks(newSelection);
  };

  const isSelected = (id: string) => selectedTasks.has(id);

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
      const formattedDeadline = formData.deadline ? new Date(formData.deadline).toISOString() : null;
      if (editingId) {
        await updateTask(editingId, { 
          title: formData.title, 
          description: formData.description, 
          links: formData.links, 
          status: formData.status,
          priority: formData.priority,
          deadline: formattedDeadline
        });
      } else {
        await createTask({ 
          ...formData, 
          parent_id: parentTaskId || undefined,
          deadline: formattedDeadline
        });
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
    setFormData({ 
      title: '', 
      description: '', 
      links: '', 
      status: TaskStatusValues.PENDING,
      priority: TaskPriorityValues.MEDIUM,
      deadline: ''
    });
  };

  const openEditModal = (task: Task) => {
    setEditingId(task.id);
    setParentTaskId(task.parent_id);
    setFormData({ 
      title: task.title, 
      description: task.description || '', 
      links: task.links || '', 
      status: task.status,
      priority: task.priority || TaskPriorityValues.MEDIUM,
      deadline: task.deadline ? task.deadline.substring(0, 16) : ''
    });
    setShowModal(true);
  };

  const openCreateModal = (parentId: string | null = null) => {
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

  const renderDeadlineBadge = (task: Task) => {
    if (!task.deadline) return null;
    const deadlineDate = new Date(task.deadline);
    const now = new Date();
    const isCompleted = task.status === TaskStatusValues.COMPLETED;
    
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const isOverdue = timeDiff < 0;
    const isApproaching = timeDiff >= 0 && timeDiff <= 24 * 60 * 60 * 1000;
    
    let badgeClass = 'deadline-normal';
    let badgeText = `Due: ${deadlineDate.toLocaleString()}`;
    
    if (!isCompleted) {
      if (isOverdue) {
        badgeClass = 'deadline-overdue';
        badgeText = `Overdue! (${deadlineDate.toLocaleString()})`;
      } else if (isApproaching) {
        badgeClass = 'deadline-approaching';
        badgeText = `Due soon! (${deadlineDate.toLocaleString()})`;
      }
    } else {
      badgeText = `Completed! (Deadline: ${deadlineDate.toLocaleDateString()})`;
    }
    
    return (
      <div className={`deadline-badge ${badgeClass}`} style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
        <Clock size={12} />
        <span>{badgeText}</span>
      </div>
    );
  };

  const renderSubtaskProgress = (task: TaskWithSubtasks) => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const total = task.subtasks.length;
    const completed = task.subtasks.filter(s => s.status === TaskStatusValues.COMPLETED).length;
    const percentage = Math.round((completed / total) * 100);

    return (
      <div className="subtask-progress-container" style={{ marginTop: '0.75rem', marginLeft: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          <span>Subtasks: {completed}/{total} completed</span>
          <span>{percentage}%</span>
        </div>
        <div className="subtask-progress-bar-bg" style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div className="subtask-progress-bar-fill" style={{ width: `${percentage}%`, height: '100%', background: 'var(--success)', borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
        </div>
      </div>
    );
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
            <div className="task-content" onClick={() => toggleSelection(task.id)}>
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
              {renderDeadlineBadge(task as Task)}
            </div>
            
            <div className="task-actions">
              <span className={`priority-badge priority-${task.priority?.toLowerCase() || 'medium'}`} style={{ marginRight: '0.5rem' }}>
                {task.priority || 'Medium'}
              </span>
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
          {/* Subtask progress bar */}
          {!isSubtask && 'subtasks' in task && renderSubtaskProgress(task)}
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

  // Compute Statistics
  const getStats = () => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;

    const traverse = (t: Task | TaskWithSubtasks) => {
      total++;
      if (t.status === TaskStatusValues.COMPLETED) completed++;
      else if (t.status === TaskStatusValues.IN_PROGRESS) inProgress++;
      else pending++;

      if (t.deadline && t.status !== TaskStatusValues.COMPLETED) {
        if (new Date(t.deadline).getTime() < new Date().getTime()) {
          overdue++;
        }
      }

      if ('subtasks' in t && t.subtasks) {
        t.subtasks.forEach(traverse);
      }
    };

    tasks.forEach(traverse);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, overdue, completionRate };
  };

  const stats = getStats();

  // Search, Filter and Sort
  const getFilteredTasks = () => {
    return tasks
      .map(task => {
        const filteredSubtasks = task.subtasks ? task.subtasks.filter(sub => {
          const matchesSearch = 
            sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sub.description && sub.description.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
          const matchesPriority = priorityFilter === 'All' || sub.priority === priorityFilter;
          
          let matchesDeadline = true;
          if (deadlineFilter !== 'All' && sub.deadline) {
            const diff = new Date(sub.deadline).getTime() - new Date().getTime();
            if (deadlineFilter === 'Overdue') matchesDeadline = diff < 0 && sub.status !== TaskStatusValues.COMPLETED;
            if (deadlineFilter === 'Due Soon') matchesDeadline = diff >= 0 && diff <= 24 * 60 * 60 * 1000 && sub.status !== TaskStatusValues.COMPLETED;
          } else if (deadlineFilter !== 'All') {
            matchesDeadline = false;
          }
          
          return matchesSearch && matchesStatus && matchesPriority && matchesDeadline;
        }) : [];

        return { ...task, subtasks: filteredSubtasks };
      })
      .filter(task => {
        const matchesSearch = 
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
        
        let matchesDeadline = true;
        if (deadlineFilter !== 'All' && task.deadline) {
          const diff = new Date(task.deadline).getTime() - new Date().getTime();
          if (deadlineFilter === 'Overdue') matchesDeadline = diff < 0 && task.status !== TaskStatusValues.COMPLETED;
          if (deadlineFilter === 'Due Soon') matchesDeadline = diff >= 0 && diff <= 24 * 60 * 60 * 1000 && task.status !== TaskStatusValues.COMPLETED;
        } else if (deadlineFilter !== 'All') {
          matchesDeadline = false;
        }

        return (matchesSearch && matchesStatus && matchesPriority && matchesDeadline) || task.subtasks.length > 0;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (sortBy === 'priority') {
          const weightA = priorityWeight[a.priority] || 0;
          const weightB = priorityWeight[b.priority] || 0;
          return weightB - weightA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  const filteredTasks = getFilteredTasks();

  if (!token) {
    return (
      <div className="login-screen">
        <div className="glass-panel login-card">
          <ListTodo size={48} className="text-primary-color" style={{ margin: '0 auto 1.5rem auto' }} />
          <h1 className="title" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Orbit Tasks</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
            Manage your tasks, coordinate subtasks, and track deadlines securely.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
            <div id="google-login-btn"></div>
          </div>
        </div>
      </div>
    );
  }

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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && (
            <div className="user-profile">
              {user.picture ? (
                <img src={user.picture} alt="Avatar" className="user-avatar" />
              ) : (
                <div className="user-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', backgroundColor: 'var(--primary-color)' }}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="user-details">
                <span className="user-name">{user.name || 'User'}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <button className="btn btn-ghost" style={{ padding: '0.25rem', borderRadius: '50%', border: 'none' }} onClick={() => setShowSettings(true)} title="Settings">
                <Settings size={16} className="text-muted" />
              </button>
              <button className="btn btn-ghost" style={{ padding: '0.25rem', borderRadius: '50%', border: 'none' }} onClick={handleSignOut} title="Sign Out">
                <LogOut size={16} className="text-muted" />
              </button>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => openCreateModal(null)}>
            <Plus size={18} /> New Task
          </button>
        </div>
      </header>

      {/* Stats Dashboard Section */}
      <div className="stats-dashboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Tasks</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{stats.completed} Completed</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completion Rate</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.completionRate}%</div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${stats.completionRate}%`, height: '100%', background: 'var(--primary-color)' }}></div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Tasks</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.inProgress + stats.pending}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.inProgress} In Progress | {stats.pending} Pending</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overdue Tasks</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--danger)' }}>{stats.overdue}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Action Required</div>
        </div>
      </div>

      {/* Toolbar / Filters Section */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexGrow: 1, gap: '0.75rem', minWidth: '280px', position: 'relative' }}>
          <Search size={16} className="text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search tasks by title or description..." 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
            <select className="form-select" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.8rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Priority:</span>
            <select className="form-select" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.8rem' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deadline:</span>
            <select className="form-select" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.8rem' }} value={deadlineFilter} onChange={e => setDeadlineFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Overdue">Overdue</option>
              <option value="Due Soon">Due Soon</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><ArrowUpDown size={14} style={{ display: 'inline', marginRight: '4px' }} />Sort:</span>
            <select className="form-select" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.8rem' }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="created_at">Created Date</option>
              <option value="deadline">Deadline</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin text-primary-color" size={32} />
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No tasks found matching your criteria.
            </div>
          ) : (
            filteredTasks.map(t => renderTask(t))
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

      {/* User Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={22} />
              Settings
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontWeight: 600 }}>Email reminders</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Receive email digests about upcoming or overdue deadlines.</div>
                </div>
                <input 
                  type="checkbox" 
                  className="custom-checkbox"
                  style={{ width: '1.5rem', height: '1.5rem' }}
                  checked={userSettings.wants_reminders}
                  onChange={e => handleToggleReminders(e.target.checked)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" onClick={() => setShowSettings(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <label className="input-label">Deadline (Optional)</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={formData.deadline || ''}
                  onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Priority</label>
                  <select 
                    className="form-select"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  >
                    <option value={TaskPriorityValues.LOW}>Low</option>
                    <option value={TaskPriorityValues.MEDIUM}>Medium</option>
                    <option value={TaskPriorityValues.HIGH}>High</option>
                  </select>
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
