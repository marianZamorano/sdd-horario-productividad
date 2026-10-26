import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Priority, TaskDto, TaskStatus } from './types';

export interface TaskInput {
  title: string;
  durationMinutes: number;
  priority: Priority;
  deadline: string | null;
  category: string | null;
}

export type TaskPatch = Partial<TaskInput> & { status?: TaskStatus };

export const TASKS_KEY = ['tasks'] as const;

export function useTasks() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: () => api.get<TaskDto[]>('/tasks') });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  // Cambiar tareas afecta también a la semana (títulos, bloques borrados en cascada).
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['week'] }),
    ]);
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: TaskInput) => api.post<TaskDto>('/tasks', input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, ...patch }: TaskPatch & { id: string }) =>
      api.patch<TaskDto>(`/tasks/${id}`, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: invalidate,
  });
}
