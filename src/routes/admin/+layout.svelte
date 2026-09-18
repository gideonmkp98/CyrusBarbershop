<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { showGlobalNav, showGlobalFooter } from '$lib/stores/layout';

  let { children, data } = $props();

  // Hide global navbar/footer on admin routes
  $effect(() => {
    showGlobalNav.set(false);
    showGlobalFooter.set(false);
    return () => {
      showGlobalNav.set(true);
      showGlobalFooter.set(true);
    };
  });

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/appointments', label: 'Afspraken' },
    { href: '/admin/time-off', label: 'Afwezigheid' },
    { href: '/admin/services', label: 'Behandelingen' },
    { href: '/admin/users', label: 'Gebruikers' },
    { href: '/admin/opening-hours', label: 'Openingstijden' }
  ];

  const accountNavItems = [
    { href: '/admin/profile', label: 'Mijn Profiel' }
  ];

  let sidebarOpen = $state(false);

  // Close the mobile drawer whenever the route changes
  $effect(() => {
    page.url.pathname;
    sidebarOpen = false;
  });

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    goto('/admin-login');
  }
</script>

<div class="min-h-screen bg-surface flex">
  <!-- Mobile top bar (hidden on desktop, sidebar takes over from lg) -->
  <header class="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 h-14 px-4 bg-surface-low border-b border-white/5">
    <a href="/admin" class="flex items-center gap-2 min-w-0">
      <img src="/images/logo.jpeg" alt="Cyrus" class="w-7 h-7 object-contain rounded-full shrink-0"/>
      <span class="font-display text-xs tracking-[0.1em] text-gold-500 truncate">CYRUS BEHEER</span>
    </a>
    <button
      onclick={() => sidebarOpen = !sidebarOpen}
      class="flex flex-col justify-center gap-1.5 w-10 h-10 -mr-2 items-center"
      aria-label="Menu openen"
      aria-expanded={sidebarOpen}
    >
      <span class="block w-5 h-px bg-bone transition-transform {sidebarOpen ? 'rotate-45 translate-y-[3.5px]' : ''}"></span>
      <span class="block w-5 h-px bg-bone transition-opacity {sidebarOpen ? 'opacity-0' : ''}"></span>
      <span class="block w-5 h-px bg-bone transition-transform {sidebarOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}"></span>
    </button>
  </header>

  <!-- Mobile drawer backdrop -->
  {#if sidebarOpen}
    <button
      class="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      aria-label="Menu sluiten"
      onclick={() => sidebarOpen = false}
    ></button>
  {/if}

  <!-- Sidebar: fixed drawer below lg, static column from lg -->
  <aside class="w-64 bg-surface-low border-r border-white/5 flex flex-col fixed top-0 left-0 h-full z-50 max-w-[85vw] transition-transform duration-200 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0">
    <div class="p-6 border-b border-white/5">
      <a href="/" class="flex items-center gap-3">
        <img src="/images/logo.jpeg" alt="Cyrus" class="w-8 h-8 object-contain rounded-full"/>
        <span class="font-display text-sm tracking-[0.1em] text-gold-500">CYRUS BEHEER</span>
      </a>
    </div>

    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      {#each navItems as item}
        <a
          href={item.href}
          class="block px-4 py-3 text-sm font-body transition-colors {page.url.pathname === item.href ? 'bg-gold-500/10 text-gold-500' : 'text-bone-muted hover:text-bone hover:bg-white/5'}"
        >{item.label}</a>
      {/each}
    </nav>

    <!-- Account section -->
    <div class="p-4 border-t border-white/5">
      <div class="mb-3 px-4">
        <span class="block text-xs font-body text-bone-muted uppercase tracking-wider">Account</span>
        <span class="block text-sm font-body text-bone truncate">{data.user.displayName}</span>
      </div>
      {#each accountNavItems as item}
        <a
          href={item.href}
          class="block px-4 py-3 text-sm font-body transition-colors {page.url.pathname === item.href ? 'bg-gold-500/10 text-gold-500' : 'text-bone-muted hover:text-bone hover:bg-white/5'}"
        >{item.label}</a>
      {/each}
    </div>

    <div class="p-4 border-t border-white/5">
      <button onclick={logout} class="block w-full text-left px-4 py-3 text-sm font-body text-bone-muted hover:text-bone hover:bg-white/5 transition-colors">
        Afmelden
      </button>
    </div>
  </aside>

  <!-- Main content: pad for mobile top bar + static offset for sidebar on lg+ -->
  <main class="flex-1 min-w-0 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 lg:ml-64">
    {@render children()}
  </main>
</div>
