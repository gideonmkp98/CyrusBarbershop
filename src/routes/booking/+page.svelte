<script lang="ts">
  import BookingSection from '$lib/components/BookingSection.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Maak een Afspraak — Cyrus Barbershop</title>
</svelte:head>

<BookingSection services={data.services} bookingEnabled={data.bookingEnabled} />