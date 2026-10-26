import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { TASKS_KEY } from './tasks';
import type { GenerateResultDto, WeekScheduleDto } from './types';

export const weekKey = (weekStart: string) => ['week', weekStart] as const;

export function useWeek(weekStart: string) {
  return useQuery({
    queryKey: weekKey(weekStart),
    queryFn: () => api.get<WeekScheduleDto>(`/schedule?weekStart=${weekStart}`),
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
