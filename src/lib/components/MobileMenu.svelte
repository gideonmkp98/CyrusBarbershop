<script lang="ts">
  import { mobileMenu } from '$lib/stores/mobileMenu';

  const links = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Behandelingen' },
    // { href: '/booking', label: 'Boeken' },
    { href: '/about', label: 'Over' },
    { href: '/contact', label: 'Contact' }
  ];
</script>

<div class="mobile-menu" class:open={$mobileMenu}>
  <button
    class="mobile-menu-close"
    aria-label="Close menu"
    onclick={() => mobileMenu.close()}
  >
    <span></span><span></span>
  </button>
  {#each links as link}
    <a href={link.href} onclick={() => mobileMenu.close()}>{link.label}</a>
  {/each}
</div>