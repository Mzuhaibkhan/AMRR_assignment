export const TaskStatusValues = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
} as const;

export type TaskStatus = typeof TaskStatusValues[keyof typeof TaskStatusValues];

export const TaskPriorityValues = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
} as const;

export type TaskPriority = typeof TaskPriorityValues[keyof typeof TaskPriorityValues];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  links: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  parent_id: string | null;
  created_at: string;
  deadline?: string | null;
}

export interface TaskWithSubtasks extends Task {
  subtasks: Task[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  links?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  parent_id?: string;
  deadline?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  links?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  deadline?: string | null;
}

export interface UserSettings {
  wants_reminders: boolean;
}
