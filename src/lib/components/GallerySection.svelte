<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
</script>

<section id="gallery" class="py-section bg-surface overflow-hidden">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <div class="text-center mb-16">
      <span use:reveal class="font-body text-label text-gold-500 block mb-4">IN ONS ATELIER</span>
      <h2 use:reveal={{ delay: 1 }} class="font-display text-heading text-bone">De Winkel</h2>
      <div use:reveal={{ delay: 2 }} class="section-divider mx-auto mt-6"></div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <div use:reveal class="gallery-item relative aspect-[3/4]">
        <img src="/images/barberchair2.jpeg" alt="Vintage barber chair" class="w-full h-full object-cover"/>
      </div>
      <div use:reveal={{ delay: 1 }} class="gallery-item relative aspect-[3/4] mt-6 md:mt-10">
        <img src="/images/storefromdesk.jpeg" alt="Barbershop workspace" class="w-full h-full object-cover"/>
      </div>
      <div use:reveal={{ delay: 2 }} class="gallery-item relative aspect-[3/4]">
        <img src="/images/barberchair1.jpeg" alt="Classic barber interior" class="w-full h-full object-cover"/>
      </div>
      <div use:reveal={{ delay: 3 }} class="gallery-item relative aspect-[3/4] mt-6 md:mt-10">
        <img src="/images/storefrombehind.jpeg" alt="Barbershop from behind" class="w-full h-full object-cover"/>
      </div>
    </div>
  </div>
</section>