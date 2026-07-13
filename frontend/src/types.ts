export const TaskStatusValues = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
} as const;

export type TaskStatus = typeof TaskStatusValues[keyof typeof TaskStatusValues];

export interface Task {
  id: number;
  title: string;
  description: string | null;
  links: string | null;
  status: TaskStatus;
  parent_id: number | null;
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
  parent_id?: number;
  deadline?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  links?: string | null;
  status?: TaskStatus;
  deadline?: string | null;
}
