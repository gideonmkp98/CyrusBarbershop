<script lang="ts">
  import { scrollStore } from '$lib/stores/scroll';
  import { mobileMenu } from '$lib/stores/mobileMenu';
  import { page } from '$app/state';

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Behandelingen' },
    // { href: '/booking', label: 'Boeken' },
    { href: '/about', label: 'Over' },
    { href: '/contact', label: 'Contact' }
  ];
</script>

<header class="nav-bg fixed w-full top-0 z-[100] border-b border-transparent" class:scrolled={$scrollStore.navScrolled}>
  <nav class="max-w-[1200px] mx-auto flex justify-between items-center px-6 md:px-8 h-20">
    <a href="/" class="flex items-center gap-3">
      <img src="/images/logo.jpeg" alt="Cyrus Barbershop" class="w-15 h-15 object-contain rounded-full"/>
      <!-- <span class="font-display text-lg md:text-xl tracking-[0.08em] text-gold-500 hidden sm:block">CYRUS</span> -->
    </a>
    <div class="hidden lg:flex items-center gap-10">
      {#each navLinks as link}
        <a
          href={link.href}
          class="nav-link font-display text-xs tracking-[0.2em] uppercase text-bone/80 hover:text-gold-500 transition-colors"
          class:active={page.url.pathname === link.href}
        >{link.label}</a>
      {/each}
    </div>
    <div class="flex items-center gap-4">
      <a href="/booking" class="btn-primary hidden md:inline-block">Maak een Afspraak</a>
      <button
        class="hamburger lg:hidden flex flex-col gap-[6px] p-2"
        class:active={$mobileMenu}
        aria-label="Toggle menu"
        onclick={() => mobileMenu.toggle()}
      >
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
</header>