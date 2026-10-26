import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AvailabilitySlotDto } from './types';

export type SlotInput = Omit<AvailabilitySlotDto, 'id'>;

const SLOTS_KEY = ['availability'] as const;

export function useSlots() {
  return useQuery({
    queryKey: SLOTS_KEY,
    queryFn: () => api.get<AvailabilitySlotDto[]>('/availability'),
  });
}

function useInvalidateSlots() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SLOTS_KEY });
}

export function useCreateSlot() {
  const invalidate = useInvalidateSlots();
  return useMutation({
    mutationFn: (input: SlotInput) => api.post<AvailabilitySlotDto>('/availability', input),
    onSuccess: invalidate,
  });
}

export function useUpdateSlot() {
  const invalidate = useInvalidateSlots();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<SlotInput> & { id: string }) =>
      api.patch<AvailabilitySlotDto>(`/availability/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSlot() {
  const invalidate = useInvalidateSlots();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/availability/${id}`),
    onSuccess: invalidate,
  });
}
