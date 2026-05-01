import { writable } from 'svelte/store';

function createMobileMenuStore() {
  const { subscribe, set, update } = writable(false);

  return {
    subscribe,
    toggle: () => {
      update(v => {
        const next = !v;
        if (typeof document !== 'undefined') {
          document.body.style.overflow = next ? 'hidden' : '';
        }
        return next;
      });
    },
    close: () => {
      set(false);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }
  };
}

export const mobileMenu = createMobileMenuStore();