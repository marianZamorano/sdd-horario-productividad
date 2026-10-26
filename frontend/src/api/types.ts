// Tipos de la API: reflejo de specs/001-schedule-productivity-mvp/contracts/*.md (constitución IV).

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'PENDING' | 'DONE';
export type BlockStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED';

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: 'EMAIL_TAKEN' | 'SLOT_OVERLAP';
}

export interface UserDto {
  id: string;
  email: string;
  timezone: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface AvailabilitySlotDto {
  id: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startMinute: number;
  endMinute: number;
}

export interface TaskDto {
  id: string;
  title: string;
  durationMinutes: number;
  priority: Priority;
  deadline: string | null;
  category: string | null;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  completedMinutes: number;
  remainingMinutes: number;
  overdue: boolean;
}

export interface ScheduleBlockDto {
  id: string;
  taskId: string;
  taskTitle: string;
  taskCategory: string | null;
  taskPriority: Priority;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: BlockStatus;
  overdue: boolean;
}

export interface UnassignedDto {
  taskId: string;
  taskTitle: string;
  minutes: number;
  reason: 'NO_SPACE' | 'NO_SPACE_BEFORE_DEADLINE';
}

export interface WeekScheduleDto {
  weekStart: string;
  timezone: string;
  blocks: ScheduleBlockDto[];
}

export interface GenerateResultDto extends WeekScheduleDto {
  unassigned: UnassignedDto[];
  createdBlocks: number;
  hasAvailability: boolean;
  hasPendingTasks: boolean;
}

export interface WeekStatsDto {
  weekStart: string;
  totalBlocks: number;
  completedBlocks: number;
  skippedBlocks: number;
  completionRate: number;
  plannedMinutes: number;
  completedMinutes: number;
  tasksCompleted: number;
  streakDays: number;
}
