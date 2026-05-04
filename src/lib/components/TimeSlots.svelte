<script lang="ts">
  interface Props {
    selectedTime?: string;
    selectTime: (time: string) => void;
    slots?: { time: string; unavailable?: boolean }[];
  }

  let {
    selectedTime = '',
    selectTime,
    slots = [
      { time: '09:00' },
      { time: '10:00' },
      { time: '11:00' },
      { time: '12:00' },
      { time: '13:00' },
      { time: '14:00' },
      { time: '15:00' },
      { time: '16:00' },
      { time: '17:00' },
      { time: '18:00', unavailable: true }
    ]
  } = $props<Props>();
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