<script lang="ts">
  import { mobileMenu } from '$lib/stores/mobileMenu';

  const links = [
    { href: '/', label: 'Start' },
    { href: '/services', label: 'Behandelingen' },
    { href: '/booking', label: 'Boeken' },
    { href: '/about', label: 'Over' },
    { href: '/contact', label: 'Contact' }
  ];
</script>

<div class="mobile-menu" class:open={$mobileMenu}>
  {#each links as link}
    <a href={link.href} onclick={() => mobileMenu.close()}>{link.label}</a>
  {/each}
</div>