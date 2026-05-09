<script lang="ts">
  // @ts-nocheck
  import { Pencil, Trash2, Plus, Scissors } from 'lucide-svelte';

  let { data } = $props();

  // Define service type
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

  // Create reactive local copy
  let services = $state<Service[]>([]);
  $effect(() => {
    if (data.services) {
      services = [...data.services];
    }
  });

  // Form state for create/edit
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

  // Delete modal state
  let showDeleteModal = $state(false);
  let serviceToDelete = $state<{ id: number; name: string } | null>(null);

  function openCreateModal() {
    editingService = null;
    formData = {
      name: '',
      description: '',
      price: '',
      duration: 45,
      category: 'hair',
      isSignature: false,
      isActive: true
    };
    formError = '';
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
    showFormModal = true;
  }

  function closeFormModal() {
    showFormModal = false;
    editingService = null;
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
      const res = await fetch('/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (action === 'create') {
          // Add new service to list
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
          // Update service in list
          editingService.name = formData.name;
          editingService.slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          editingService.description = formData.description;
          editingService.price = formData.price;
          editingService.duration = formData.duration;
          editingService.category = formData.category;
          editingService.isSignature = formData.isSignature;
          editingService.isActive = formData.isActive;
        }
        closeFormModal();
      } else {
        formError = result.error || 'Fout bij opslaan';
      }
    } catch (e: any) {
      formError = 'Netwerkfout: ' + (e.message || e);
    }
  }

  async function handleDelete() {
    if (!serviceToDelete) return;

    try {
      const res = await fetch('/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceToDelete.id, _action: 'delete' })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        services = services.filter(s => s.id !== serviceToDelete!.id);
        closeDeleteModal();
      } else {
        alert(result.error || 'Verwijderen mislukt');
      }
    } catch (e: any) {
      alert('Netwerkfout: ' + (e.message || e));
    }
  }

  async function toggleActive(id: number, isActive: boolean) {
    try {
      const res = await fetch('/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: String(isActive) })
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
      default: return category;
    }
  }

  function getCategoryColor(category: string): string {
    switch (category) {
      case 'hair': return 'text-blue-400 bg-blue-500/10';
      case 'beard': return 'text-green-400 bg-green-500/10';
      case 'signature': return 'text-gold-500 bg-gold-500/10';
      default: return 'text-bone-muted bg-bone-muted/10';
    }
  }
</script>

<svelte:head>
  <title>Behandelingen — Cyrus Beheer</title>
</svelte:head>

{#if data.canManageServices}
  <div class="flex justify-between items-center mb-8">
    <h1 class="font-display text-heading text-bone">Behandelingen</h1>
    <button onclick={openCreateModal} class="btn-primary flex items-center gap-2">
      <Plus size={18} />
      Nieuwe Behandeling
    </button>
  </div>

  <!-- Services list -->
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
        {#each services as service}
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
              <span class="font-body text-xs px-2 py-1 rounded {getCategoryColor(service.category)}">
                {getCategoryLabel(service.category)}
              </span>
            </td>
            <td class="p-4 font-body text-bone">€{service.price}</td>
            <td class="p-4 font-body text-bone-muted">{service.duration} min</td>
            <td class="p-4">
              {#if service.isSignature}
                <Scissors class="text-gold-500" size={18} title="Signature Behandeling" />
              {:else}
                <span class="text-bone-muted">—</span>
              {/if}
            </td>
            <td class="p-4">
              <button
                onclick={() => toggleActive(service.id, service.isActive)}
                class="font-body text-label {service.isActive ? 'text-green-500 hover:text-green-400' : 'text-red-400 hover:text-red-300'} transition-colors"
              >
                {service.isActive ? 'Actief' : 'Inactief'}
              </button>
            </td>
            <td class="p-4">
              <div class="flex gap-2">
                <button
                  onclick={() => openEditModal(service)}
                  class="p-1.5 rounded hover:bg-white/5 transition-colors text-blue-400 hover:text-blue-300"
                  title="Bewerken"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onclick={() => openDeleteModal(service.id, service.name)}
                  class="p-1.5 rounded hover:bg-white/5 transition-colors text-red-400 hover:text-red-300"
                  title="Verwijderen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        {/each}
        {#if services.length === 0}
          <tr>
            <td colspan="7" class="p-8 text-center text-bone-muted">
              Geen behandelingen gevonden. Maak je eerste behandeling aan.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Create/Edit Modal -->
  {#if showFormModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 w-full" onclick={closeFormModal}>
      <div class="bg-surface-base p-8 rounded-lg border border-white/10 max-w-2xl w-full mx-6 shadow-2xl max-h-[90vh] overflow-y-auto" onclick={e => e.stopPropagation()}>
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
            <Scissors class="text-gold-500" size={20} />
          </div>
          <div>
            <h3 class="font-display text-subheading text-bone">
              {editingService ? 'Behandeling Bewerken' : 'Nieuwe Behandeling'}
            </h3>
            <p class="font-body text-sm text-bone-muted">
              {editingService ? 'Pas de behandeling aan' : 'Voeg een nieuwe behandeling toe'}
            </p>
          </div>
        </div>

        {#if formError}
          <div class="bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-400 mb-4 rounded">
            {formError}
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="space-y-4">
          <div class="grid md:grid-cols-2 gap-4">
            <div class="field-group">
              <input type="text" id="name" bind:value={formData.name} placeholder=" " required />
              <label for="name">Naam</label>
            </div>
            <div class="field-group">
              <input type="number" id="price" bind:value={formData.price} placeholder=" " step="0.01" required />
              <label for="price">Prijs (€)</label>
            </div>
          </div>

          <div class="field-group">
            <textarea id="description" bind:value={formData.description} placeholder=" " rows="3" />
            <label for="description">Beschrijving (optioneel)</label>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div class="field-group">
              <input type="number" id="duration" bind:value={formData.duration} placeholder=" " min="5" step="5" required />
              <label for="duration">Duur (minuten)</label>
            </div>
            <div class="field-group">
              <select id="category" bind:value={formData.category}>
                <option value="hair">Haar</option>
                <option value="beard">Baard</option>
                <option value="signature">Signature</option>
              </select>
              <label for="category">Categorie</label>
            </div>
          </div>

          <div class="flex gap-6 pt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" bind:checked={formData.isSignature} class="w-4 h-4 text-gold-500" />
              <span class="font-body text-body text-bone">Signature Behandeling</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" bind:checked={formData.isActive} class="w-4 h-4 text-green-500" />
              <span class="font-body text-body text-bone">Actief</span>
            </label>
          </div>

          <div class="flex gap-4 pt-4">
            <button type="button" onclick={closeFormModal} class="flex-1 btn-outline py-3">
              Annuleren
            </button>
            <button type="submit" class="flex-1 btn-primary py-3">
              {editingService ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 w-full" onclick={closeDeleteModal}>
      <div class="bg-surface-base p-8 rounded-lg border border-white/10 max-w-md w-full mx-6 shadow-2xl" onclick={e => e.stopPropagation()}>
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span class="text-red-400 text-3xl">!</span>
          </div>
          <h3 class="font-display text-subheading text-bone mb-2">Behandeling Verwijderen</h3>
          <p class="font-body text-body text-bone-muted">
            Weet je zeker dat je <span class="text-bone font-semibold">{serviceToDelete?.name}</span> wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
          </p>
        </div>
        <div class="flex gap-4">
          <button onclick={closeDeleteModal} class="flex-1 btn-outline py-3 border-bone-muted/30 text-bone-muted hover:border-bone-muted/50">
            Annuleren
          </button>
          <button onclick={handleDelete} class="flex-1 btn-primary py-3 bg-red-500 hover:bg-red-600 text-white">
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="text-center py-20">
    <h1 class="font-display text-subheading text-bone-muted mb-4">Toegang Geweigerd</h1>
    <p class="font-body text-body text-bone-muted">Alleen hoofdaccounts kunnen behandelingen beheren.</p>
  </div>
{/if}
