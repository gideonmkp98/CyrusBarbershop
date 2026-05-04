import type { HTMLAttributes } from 'svelte/elements';

declare global {
  namespace App {
    interface Locals {
      user?: {
        id: number;
        email: string;
        displayName: string;
        role: 'owner' | 'manager' | 'staff';
        isActive: boolean;
      };
    }
  }

  // Svelte 5 runes type definitions
  function $state<T>(value: T): T;
  function $derive<T>(value: T): T;
  function $derived<T>(value: T): T;
  function $effect(fn: () => void | (() => void)): void;
  namespace $effect {
    function pre(fn: () => void | (() => void)): void;
  }
  function $props(): any;
  function $bindable<T>(value?: T): T;
  function $inspect<T>(value: T): T;

  namespace svelteHTML {
    interface HTMLAttributes<T> extends HTMLAttributes<T> {
      [key: string]: any;
    }
  }
}

export {};