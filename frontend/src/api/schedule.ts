import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { TASKS_KEY } from './tasks';
import type {
  BlockStatus,
  GenerateResultDto,
  ScheduleBlockDto,
  TaskDto,
  WeekScheduleDto,
} from './types';

export const weekKey = (weekStart: string) => ['week', weekStart] as const;

export function useWeek(weekStart: string) {
  return useQuery({
    queryKey: weekKey(weekStart),
    queryFn: () => api.get<WeekScheduleDto>(`/schedule?weekStart=${weekStart}`),
  });
}

interface UpdateBlockStatusVars {
  blockId: string;
  status: BlockStatus;
  weekStart: string;
}

/** FR-019 con actualización optimista: se ve al instante y se revierte si la API falla. */
export function useUpdateBlockStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockId, status }: UpdateBlockStatusVars) =>
      api.patch<{ block: ScheduleBlockDto; task: TaskDto }>(`/schedule/blocks/${blockId}`, {
        status,
      }),
    onMutate: async ({ blockId, status, weekStart }) => {
      const key = weekKey(weekStart);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WeekScheduleDto>(key);
      if (previous) {
        queryClient.setQueryData<WeekScheduleDto>(key, {
          ...previous,
          blocks: previous.blocks.map((b) => (b.id === blockId ? { ...b, status } : b)),
        });
      }
      return { previous };
    },
    onError: (_error, { weekStart }, context) => {
      if (context?.previous) queryClient.setQueryData(weekKey(weekStart), context.previous);
    },
    onSuccess: ({ block }, { weekStart }) => {
      queryClient.setQueryData<WeekScheduleDto>(weekKey(weekStart), (current) =>
        current
          ? { ...current, blocks: current.blocks.map((b) => (b.id === block.id ? block : b)) }
          : current,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useGenerate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekStart: string) =>
      api.post<GenerateResultDto>('/schedule/generate', { weekStart }),
    onSuccess: (result) => {
      const { weekStart, timezone, blocks } = result;
      queryClient.setQueryData<WeekScheduleDto>(weekKey(weekStart), {
        weekStart,
        timezone,
        blocks,
      });
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
