import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let counter = 0;

export const toasts = writable<Toast[]>([]);

/** Voeg een toast toe. Duration 0 = blijf staan tot handmatig gesloten. */
export function addToast(type: ToastType, message: string, duration = 3500): number {
  const id = ++counter;
  toasts.update((list) => [...list, { id, type, message }]);
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  return id;
}

export function removeToast(id: number): void {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

export const toast = {
  success: (message: string, duration?: number) => addToast('success', message, duration),
  error: (message: string, duration?: number) => addToast('error', message, duration),
  info: (message: string, duration?: number) => addToast('info', message, duration)
};