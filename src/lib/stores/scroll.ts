import { writable } from 'svelte/store';

interface ScrollState {
  progress: number;
  y: number;
  navScrolled: boolean;
}

function createScrollStore() {
  const { subscribe, set } = writable<ScrollState>({
    progress: 0,
    y: 0,
    navScrolled: false
  });

  let initialized = false;

  function init() {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      set({
        progress: scrollTop / docHeight,
        y: scrollTop,
        navScrolled: scrollTop > 80
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  return { subscribe, init };
}

export const scrollStore = createScrollStore();