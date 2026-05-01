<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  let { children } = $props();

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/appointments', label: 'Afspraken' },
    { href: '/admin/users', label: 'Gebruikers' }
  ];

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    goto('/admin-login');
  }
</script>

<div class="min-h-screen bg-surface flex">
  <!-- Sidebar -->
  <aside class="w-64 bg-surface-low border-r border-white/5 flex flex-col">
    <div class="p-6 border-b border-white/5">
      <a href="/" class="flex items-center gap-3">
        <img src="/images/logo.jpeg" alt="Cyrus" class="w-8 h-8 object-contain rounded-full"/>
        <span class="font-display text-sm tracking-[0.1em] text-gold-500">CYRUS BEHEER</span>
      </a>
    </div>

    <nav class="flex-1 p-4 space-y-1">
      {#each navItems as item}
        <a
          href={item.href}
          class="block px-4 py-3 text-sm font-body transition-colors {page.url.pathname === item.href ? 'bg-gold-500/10 text-gold-500' : 'text-bone-muted hover:text-bone hover:bg-white/5'}"
        >{item.label}</a>
      {/each}
    </nav>

    <div class="p-4 border-t border-white/5">
      <button onclick={logout} class="block w-full text-left px-4 py-3 text-sm font-body text-bone-muted hover:text-bone hover:bg-white/5 transition-colors">
        Afmelden
      </button>
    </div>
  </aside>

  <!-- Main content -->
  <main class="flex-1 p-8">
    {@render children()}
  </main>
</div>