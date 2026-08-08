<script lang="ts">
  import { Pencil, Trash2, Plus, Scissors, Eye, EyeOff, Sparkles, User, ClipboardList, AlertTriangle, CheckCircle, Gem, Layers } from 'lucide-svelte';

  let { data } = $props();

  // Tooltip state
  let tooltipText = $state('');
  let tooltipVisible = $state(false);
  let tooltipPosition = $state({ x: 0, y: 0 });

  function showTooltip(e: MouseEvent, text: string) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    tooltipPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    };
    tooltipText = text;
    tooltipVisible = true;
  }

  function hideTooltip() {
    tooltipVisible = false;
  }

  interface Service {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    price: string;
    duration: number;
    category: string;
    isSignature: boolean;
    displayOrder: number;
    isActive: boolean;
  }

  let services = $state<Service[]>([]);
  $effect(() => {
    if (data.services) {
      services = [...data.services];
    }
  });

  // View state
  let viewMode = $state<'grid' | 'list'>('grid');
  let filterCategory = $state('all');
  let filterStatus = $state('all');
  let searchQuery = $state('');

  // Filtered services
  let filteredServices = $derived(
    services.filter(s => {
      if (filterCategory !== 'all' && s.category !== filterCategory) return false;
      if (filterStatus !== 'all') {
        if (filterStatus === 'active' && !s.isActive) return false;
        if (filterStatus === 'inactive' && s.isActive) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${s.name} ${s.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
  );

  // Stats
  let totalServices = $derived(services.length);
  let activeServices = $derived(services.filter(s => s.isActive).length);
  let signatureServices = $derived(services.filter(s => s.isSignature).length);

  // Modal state
  let showFormModal = $state(false);
  let editingService = $state<Service | null>(null);
  let formData = $state({
    name: '',
    description: '',
    price: '',
    duration: 45,
    category: 'hair',
    isSignature: false,
    isActive: true
  });
  let formError = $state('');
  let formSuccess = $state('');

  let showDeleteModal = $state(false);
  let serviceToDelete = $state<{ id: number; name: string } | null>(null);

  function openCreateModal() {
    editingService = null;
    formData = { name: '', description: '', price: '', duration: 45, category: 'hair', isSignature: false, isActive: true };
    formError = '';
    formSuccess = '';
    showFormModal = true;
  }

  function openEditModal(service: Service) {
    editingService = service;
    formData = {
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration: service.duration,
      category: service.category,
      isSignature: service.isSignature,
      isActive: service.isActive
    };
    formError = '';
    formSuccess = '';
    showFormModal = true;
  }

  function closeFormModal() {
    showFormModal = false;
    editingService = null;
    formError = '';
    formSuccess = '';
  }

  function openDeleteModal(id: number, name: string) {
    serviceToDelete = { id, name };
    showDeleteModal = true;
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    serviceToDelete = null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formSuccess = '';

    if (!formData.name || !formData.price) {
      formError = 'Naam en prijs zijn verplicht';
      return;
    }

    const action = editingService ? 'update' : 'create';
    const body = {
      id: editingService?.id,
      name: formData.name,
      description: formData.description,
      price: formData.price,
      duration: formData.duration,
      category: formData.category,
      isSignature: formData.isSignature ? 'on' : 'off',
      isActive: formData.isActive ? 'on' : 'off'
    };

    try {
      const res = await fetch('/admin/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        formSuccess = action === 'create' ? 'Behandeling succesvol aangemaakt!' : 'Behandeling succesvol bijgewerkt!';

        if (action === 'create') {
          const newService: Service = {
            id: result.id,
            name: formData.name,
            slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            description: formData.description,
            price: formData.price,
            duration: formData.duration,
            category: formData.category,
            isSignature: formData.isSignature,
            displayOrder: 0,
            isActive: formData.isActive
          };
          services.push(newService);
        } else if (action === 'update' && editingService) {
          editingService.name = formData.name;
          editingService.slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          editingService.description = formData.description;
          editingService.price = formData.price;
          editingService.duration = formData.duration;
          editingService.category = formData.category;
          editingService.isSignature = formData.isSignature;
          editingService.isActive = formData.isActive;
        }

        setTimeout(() => {
          closeFormModal();
        }, 1200);
      } else {
        formError = result.error || 'Fout bij opslaan';
      }
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      formError = 'Netwerkfout: ' + (errorMsg || 'Onbekende fout');
    }
  }

  async function handleDelete() {
    if (!serviceToDelete) return;

    try {
      const res = await fetch('/admin/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceToDelete.id, _action: 'delete' })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        services = services.filter(s => s.id !== serviceToDelete!.id);
        closeDeleteModal();
      } else {
        formError = result.error || 'Verwijderen mislukt';
      }
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      formError = 'Netwerkfout: ' + (errorMsg || 'Onbekende fout');
    }
  }

  async function toggleActive(id: number, isActive: boolean) {
    try {
      const res = await fetch('/admin/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: String(isActive), _action: 'toggle' })
      });

      if (res.ok) {
        const service = services.find(s => s.id === id);
        if (service) {
          service.isActive = !isActive;
        }
      }
    } catch (e: any) {
      console.error('Toggle active error:', e);
    }
  }

  function getCategoryLabel(category: string): string {
    switch (category) {
      case 'hair': return 'Haar';
      case 'beard': return 'Baard';
      case 'signature': return 'Signature';
      case 'extra': return 'Extra';
      default: return category;
    }
  }

  function getCategoryColor(category: string): string {
    switch (category) {
      case 'hair': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'beard': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'signature': return 'text-gold-500 bg-gold-500/10 border-gold-500/20';
      case 'extra': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-bone-muted bg-bone-muted/10 border-bone-muted/20';
    }
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case 'hair': return Scissors;
      case 'beard': return User;
      case 'signature': return Sparkles;
      case 'extra': return Layers;
      default: return ClipboardList;
    }
  }
</script>

<svelte:head>
  <title>Behandelingen — Cyrus Beheer</title>
</svelte:head>

{#if data.canManageServices}
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
    <div>
      <h1 class="font-display text-heading text-bone">Behandelingen</h1>
      <p class="text-bone-muted font-body text-sm mt-1">
        {totalServices} totaal · {activeServices} actief · {signatureServices} signature
      </p>
    </div>
    <button onclick={openCreateModal} class="btn-primary flex items-center gap-2 self-start md:self-auto">
      <Plus size={18} />
      Nieuwe Behandeling
    </button>
  </div>

  <!-- Filters bar -->
  <div class="flex flex-col md:flex-row gap-3 mb-6">
    <!-- Category filter -->
    <div class="relative">
      <select
        bind:value={filterCategory}
        class="bg-surface-base border border-white/10 pl-9 pr-3 py-1.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 appearance-none"
      >
        <option value="all">Alle categorieën</option>
        <option value="hair">Haar</option>
        <option value="beard">Baard</option>
        <option value="signature">Signature</option>
        <option value="extra">Extra</option>
      </select>
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-bone-muted">
        <ClipboardList size={14} />
      </div>
    </div>

    <!-- Status filter -->
    <div class="relative">
      <select
        bind:value={filterStatus}
        class="bg-surface-base border border-white/10 pl-9 pr-3 py-1.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 appearance-none"
      >
        <option value="all">Alle statussen</option>
        <option value="active">Actief</option>
        <option value="inactive">Inactief</option>
      </select>
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-bone-muted">
        <Eye size={14} />
      </div>
    </div>

    <!-- Search -->
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Zoek behandelingen..."
      class="bg-surface-base border border-white/10 px-3 py-1.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 w-full md:w-64 placeholder:text-bone-muted/50"
    />

    <!-- View toggle -->
    <div class="flex md:ml-auto bg-surface-base border border-white/10 overflow-hidden">
      <button
        onclick={() => viewMode = 'grid'}
        class="px-3 py-1.5 text-sm font-body transition-colors {viewMode === 'grid' ? 'bg-gold-500 text-surface' : 'text-bone hover:text-bone'}"
      >
        Grid
      </button>
      <button
        onclick={() => viewMode = 'list'}
        class="px-3 py-1.5 text-sm font-body transition-colors {viewMode === 'list' ? 'bg-gold-500 text-surface' : 'text-bone hover:text-bone'}"
      >
        Lijst
      </button>
    </div>
  </div>

  <!-- Grid View -->
  {#if viewMode === 'grid'}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredServices as service}
        {@const IconComponent = getCategoryIcon(service.category)}
        <div class="bg-surface-base border border-white/5 p-5 hover:border-white/10 transition-all group">
          <div class="flex justify-between items-start mb-3">
            <span class="text-xs font-body px-2 py-1 border flex items-center gap-1.5 {getCategoryColor(service.category)}">
              <IconComponent size={12} />
              {getCategoryLabel(service.category)}
            </span>
            {#if service.isSignature}
              <div onmouseenter={(e) => showTooltip(e, 'Signature Behandeling')} onmouseleave={hideTooltip}>
                <Sparkles class="text-gold-500" size={16} />
              </div>
            {:else if service.category === 'extra'}
              <div onmouseenter={(e) => showTooltip(e, 'Extra — te kiezen bovenop een behandeling')} onmouseleave={hideTooltip}>
                <Plus class="text-purple-400" size={16} />
              </div>
            {/if}
          </div>

          <h3 class="font-display text-subheading text-bone mb-1">{service.name}</h3>

          {#if service.description}
            <p class="font-body text-xs text-bone-muted mb-3 line-clamp-2">{service.description}</p>
          {:else}
            <p class="font-body text-xs text-bone-muted mb-3 italic">Geen beschrijving</p>
          {/if}

          <div class="flex justify-between items-center mb-4">
            <span class="font-display text-lg text-gold-500">€{service.price}</span>
            <span class="font-body text-sm text-bone-muted">{service.duration} min</span>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              onclick={() => toggleActive(service.id, service.isActive)}
              class="flex items-center gap-1.5 text-xs font-body transition-colors {service.isActive ? 'text-green-500 hover:text-green-400' : 'text-bone-muted hover:text-bone'}"
            >
              {#if service.isActive}
                <Eye size={14} />
                Actief
              {:else}
                <EyeOff size={14} />
                Inactief
              {/if}
            </button>

            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onclick={() => openEditModal(service)}
                onmouseenter={(e) => showTooltip(e, 'Bewerken')}
                onmouseleave={hideTooltip}
                class="p-1.5 hover:bg-white/5 transition-colors text-blue-400 hover:text-blue-300"
              >
                <Pencil size={14} />
              </button>
              <button
                onclick={() => openDeleteModal(service.id, service.name)}
                onmouseenter={(e) => showTooltip(e, 'Verwijderen')}
                onmouseleave={hideTooltip}
                class="p-1.5 hover:bg-white/5 transition-colors text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      {/each}

      {#if filteredServices.length === 0}
        <div class="col-span-full p-12 text-center text-bone-muted">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-low flex items-center justify-center">
            <Scissors size={32} class="opacity-20" />
          </div>
          {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
            ? 'Geen behandelingen gevonden met deze filters.'
            : 'Geen behandelingen gevonden. Maak je eerste behandeling aan.'}
        </div>
      {/if}
    </div>

  {:else}
    <!-- List View -->
    <div class="bg-surface-base border border-white/5 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-white/5">
            <th class="text-left p-4 font-body text-label text-bone-muted">Naam</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Categorie</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Prijs</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Duur</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Signature</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Status</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Acties</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredServices as service}
            {@const IconComponent = getCategoryIcon(service.category)}
            <tr class="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              <td class="p-4">
                <div>
                  <span class="font-body text-bone block">{service.name}</span>
                  {#if service.description}
                    <span class="font-body text-xs text-bone-muted block mt-1">{service.description}</span>
                  {/if}
                </div>
              </td>
              <td class="p-4">
                <span class="font-body text-xs px-2 py-1 border flex items-center gap-1.5 {getCategoryColor(service.category)}">
                  <IconComponent size={12} />
                  {getCategoryLabel(service.category)}
                </span>
              </td>
              <td class="p-4 font-display text-bone text-gold-500">€{service.price}</td>
              <td class="p-4 font-body text-bone-muted">{service.duration} min</td>
              <td class="p-4">
                {#if service.isSignature}
                  <div onmouseenter={(e) => showTooltip(e, 'Signature Behandeling')} onmouseleave={hideTooltip}>
                    <Sparkles class="text-gold-500" size={16} />
                  </div>
                {:else}
                  <span class="text-bone-muted">—</span>
                {/if}
              </td>
              <td class="p-4">
                <button
                  onclick={() => toggleActive(service.id, service.isActive)}
                  class="flex items-center gap-1.5 font-body text-label transition-colors {service.isActive ? 'text-green-500 hover:text-green-400' : 'text-bone-muted hover:text-bone'}"
                >
                  {#if service.isActive}
                    <Eye size={14} />
                  {:else}
                    <EyeOff size={14} />
                  {/if}
                  {service.isActive ? 'Actief' : 'Inactief'}
                </button>
              </td>
              <td class="p-4">
                <div class="flex gap-2">
                  <button
                    onclick={() => openEditModal(service)}
                    onmouseenter={(e) => showTooltip(e, 'Bewerken')}
                    onmouseleave={hideTooltip}
                    class="p-1.5 hover:bg-white/5 transition-colors text-blue-400 hover:text-blue-300"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onclick={() => openDeleteModal(service.id, service.name)}
                    onmouseenter={(e) => showTooltip(e, 'Verwijderen')}
                    onmouseleave={hideTooltip}
                    class="p-1.5 hover:bg-white/5 transition-colors text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}

          {#if filteredServices.length === 0}
            <tr>
              <td colspan="7" class="p-8 text-center text-bone-muted">
                {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'Geen behandelingen gevonden met deze filters.'
                  : 'Geen behandelingen gevonden. Maak je eerste behandeling aan.'}
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Create/Edit Modal -->
  {#if showFormModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeFormModal} onkeydown={(e) => e.key === 'Enter' && closeFormModal()}>
      <div class="bg-surface-base p-8 border border-white/10 max-w-2xl w-full mx-6 shadow-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" tabindex="-1" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeFormModal()}>
        <div class="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
          <div class="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center">
            <Scissors class="text-gold-500" size={24} />
          </div>
          <div>
            <h3 class="font-display text-subheading text-bone">
              {editingService ? 'Behandeling Bewerken' : 'Nieuwe Behandeling'}
            </h3>
            <p class="font-body text-sm text-bone-muted">
              {editingService ? 'Pas de gegevens van de behandeling aan' : 'Voeg een nieuwe behandeling toe aan het aanbod'}
            </p>
          </div>
        </div>

        {#if formError}
          <div class="bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 mb-4 flex items-start gap-2">
            <AlertTriangle size={18} class="shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        {/if}

        {#if formSuccess}
          <div class="bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400 mb-4 flex items-start gap-2">
            <CheckCircle size={18} class="shrink-0 mt-0.5" />
            <span>{formSuccess}</span>
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="space-y-5">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="service-name" class="block text-xs font-body text-bone-muted mb-2">Naam *</label>
              <input
                id="service-name"
                type="text"
                bind:value={formData.name}
                class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors"
                placeholder="Bijv. Haarknippen"
                required
              />
            </div>
            <div>
              <label for="service-price" class="block text-xs font-body text-bone-muted mb-2">Prijs (€) *</label>
              <input
                id="service-price"
                type="number"
                bind:value={formData.price}
                class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors"
                placeholder="35.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label for="service-description" class="block text-xs font-body text-bone-muted mb-2">Beschrijving</label>
            <textarea
              id="service-description"
              bind:value={formData.description}
              class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors resize-none"
              placeholder="Beschrijf de behandeling..."
              rows="3"
            ></textarea>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="service-duration" class="block text-xs font-body text-bone-muted mb-2">Duur (minuten)</label>
              <input
                id="service-duration"
                type="number"
                bind:value={formData.duration}
                class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors"
                min="5"
                step="5"
              />
            </div>
            <div>
              <label for="service-category" class="block text-xs font-body text-bone-muted mb-2">Categorie</label>
              <select
                id="service-category"
                bind:value={formData.category}
                class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors"
              >
                <option value="hair">Haar</option>
                <option value="beard">Baard</option>
                <option value="signature">Signature</option>
                <option value="extra">Extra</option>
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-3 pt-2 border-t border-white/5">
            <label class="flex items-center gap-3 cursor-pointer p-3 bg-surface-low border border-white/5 hover:border-gold-500/30 transition-colors">
              <input type="checkbox" bind:checked={formData.isSignature} class="w-5 h-5 text-gold-500 accent-gold-500" />
              <div class="flex items-center gap-3">
                <Sparkles size={18} class="text-gold-500" />
                <div>
                  <span class="block font-body text-sm text-bone">Signature Behandeling</span>
                  <span class="block font-body text-xs text-bone-muted">Markeer als premium behandeling</span>
                </div>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer p-3 bg-surface-low border border-white/5 hover:border-green-500/30 transition-colors">
              <input type="checkbox" bind:checked={formData.isActive} class="w-5 h-5 text-green-500 accent-green-500" />
              <div class="flex items-center gap-3">
                <Eye size={18} class="text-green-500" />
                <div>
                  <span class="block font-body text-sm text-bone">Actief</span>
                  <span class="block font-body text-xs text-bone-muted">Toon deze behandeling op de website</span>
                </div>
              </div>
            </label>
          </div>

          <div class="flex gap-4 pt-4 border-t border-white/5">
            <button type="button" onclick={closeFormModal} class="flex-1 px-4 py-2.5 bg-surface-low border border-white/10 text-bone-muted hover:text-bone hover:border-white/20 text-sm font-body transition-all">
              Annuleren
            </button>
            <button type="submit" class="flex-1 px-4 py-2.5 bg-gold-500 text-surface text-sm font-body hover:bg-gold-600 transition-colors">
              {editingService ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeDeleteModal} onkeydown={(e) => e.key === 'Enter' && closeDeleteModal()}>
      <div class="bg-surface-base p-8 border border-white/10 max-w-md w-full mx-6 shadow-2xl" role="dialog" aria-modal="true" tabindex="-1" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()}>
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} class="text-red-400" />
          </div>
          <h3 class="font-display text-subheading text-bone mb-2">Behandeling Verwijderen</h3>
          <p class="font-body text-body text-bone-muted">
            Weet je zeker dat je <span class="text-bone font-semibold">{serviceToDelete?.name}</span> wilt verwijderen?
          </p>
          <p class="font-body text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
            <AlertTriangle size={12} />
            Deze actie kan niet ongedaan worden gemaakt.
          </p>
        </div>
        <div class="flex gap-3">
          <button onclick={closeDeleteModal} class="flex-1 px-4 py-2.5 bg-surface-low border border-white/10 text-bone-muted hover:text-bone hover:border-white/20 text-sm font-body transition-all">
            Annuleren
          </button>
          <button onclick={handleDelete} class="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-body hover:bg-red-600 transition-colors">
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Custom Tooltip -->
  {#if tooltipVisible}
    <div
      class="fixed px-3 py-1.5 bg-surface-base text-bone text-xs font-body whitespace-nowrap z-[100] pointer-events-none border border-white/10 shadow-xl"
      style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; transform: translate(-50%, -100%);"
    >
      {tooltipText}
    </div>
  {/if}

{:else}
  <div class="text-center py-20">
    <h1 class="font-display text-subheading text-bone-muted mb-4">Toegang Geweigerd</h1>
    <p class="font-body text-body text-bone-muted">Alleen hoofdaccounts kunnen behandelingen beheren.</p>
  </div>
{/if}
