<script lang="ts">
  export let selectedTime: string = '';
  export let selectTime: (time: string) => void;
  export let slots: { time: string; unavailable?: boolean }[] = [
    { time: '09:00 AM' },
    { time: '10:00 AM' },
    { time: '11:00 AM' },
    { time: '12:00 PM' },
    { time: '01:00 PM' },
    { time: '02:00 PM' },
    { time: '03:00 PM' },
    { time: '04:00 PM' },
    { time: '05:00 PM' },
    { time: '06:00 PM', unavailable: true }
  ];
</script>

<div>
  <span class="font-body text-label text-bone-muted block mb-4">BESCHIKBARE MOMENTEN</span>
  <div class="grid grid-cols-2 gap-2">
    {#each slots as slot}
      <button
        class="time-slot"
        class:selected={selectedTime === slot.time && !slot.unavailable}
        class:unavailable={slot.unavailable}
        disabled={slot.unavailable}
        onclick={() => !slot.unavailable && selectTime(slot.time)}
      >{slot.time}</button>
    {/each}
  </div>
</div>