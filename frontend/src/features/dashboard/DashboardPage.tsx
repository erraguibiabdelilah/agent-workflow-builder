import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Copy, LayoutGrid, List, MoreHorizontal, Play, Plus, Power, Search, Trash2, Workflow as WorkflowIcon } from 'lucide-react';
import { workflows, type WorkflowListItem } from '../../lib/api';

type ViewMode = 'cards' | 'list';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortMode = 'updated' | 'name' | 'created';

function relativeDate(date: string): string {
  const elapsed = Date.now() - new Date(date).getTime();
  let unit: Intl.RelativeTimeFormatUnit = 'minute';
  let unitSize = 60_000;
  if (elapsed >= 31_536_000_000) { unit = 'year'; unitSize = 31_536_000_000; }
  else if (elapsed >= 2_592_000_000) { unit = 'month'; unitSize = 2_592_000_000; }
  else if (elapsed >= 86_400_000) { unit = 'day'; unitSize = 86_400_000; }
  else if (elapsed >= 3_600_000) { unit = 'hour'; unitSize = 3_600_000; }
  const formatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (elapsed < 60_000) return 'à l’instant';
  return formatter.format(-Math.floor(elapsed / unitSize), unit);
}

function latestStatus(workflow: WorkflowListItem): { label: string; tone: string } {
  if (!workflow.last_execution) return { label: 'Jamais exécuté', tone: 'text-slate-500' };
  if (workflow.last_execution.status === 'success') return { label: 'Succès', tone: 'text-emerald-400' };
  if (workflow.last_execution.status === 'error') return { label: 'Échec', tone: 'text-red-400' };
  return { label: workflow.last_execution.status, tone: 'text-slate-400' };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>(() => localStorage.getItem('agentflow-workflow-view') === 'list' ? 'list' : 'cards');

  const { data: workflowsList, isLoading, error, refetch } = useQuery({ queryKey: ['workflows'], queryFn: workflows.list });
  const createMutation = useMutation({
    mutationFn: (name: string) => workflows.create({ name }),
    onSuccess: (workflow) => {
      void queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setCreatingWorkflow(false);
      setNewWorkflowName('');
      navigate(`/workflows/${workflow.id}`);
    },
  });
  const deleteMutation = useMutation({ mutationFn: workflows.delete, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workflows'] }) });
  const duplicateMutation = useMutation({ mutationFn: workflows.duplicate, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workflows'] }) });
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => active ? workflows.deactivate(id) : workflows.activate(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const visibleWorkflows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('fr');
    return [...(workflowsList ?? [])]
      .filter((workflow) => workflow.name.toLocaleLowerCase('fr').includes(normalizedSearch))
      .filter((workflow) => statusFilter === 'all' || (statusFilter === 'active' ? workflow.active : !workflow.active))
      .sort((left, right) => sortMode === 'name'
        ? left.name.localeCompare(right.name, 'fr')
        : sortMode === 'created'
          ? left.created_at.localeCompare(right.created_at)
          : right.updated_at.localeCompare(left.updated_at));
  }, [search, sortMode, statusFilter, workflowsList]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (newWorkflowName.trim()) createMutation.mutate(newWorkflowName.trim());
  };
  const updateView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('agentflow-workflow-view', mode);
  };
  const deleteWorkflow = (workflow: WorkflowListItem) => {
    if (confirm(`Supprimer « ${workflow.name} » ?`)) deleteMutation.mutate(workflow.id);
  };

  if (isLoading) {
    return <div className="space-y-4" aria-label="Chargement des workflows">
      <div className="mb-8 h-8 w-56 animate-pulse rounded bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl border border-slate-700 bg-slate-800" />)}</div>
    </div>;
  }

  if (error) {
    return <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-slate-700 bg-slate-800/60 text-center">
      <AlertCircle size={24} className="text-red-400" />
      <div><h2 className="font-semibold text-white">Impossible de charger les workflows</h2><p className="mt-1 text-sm text-slate-400">Vérifiez votre connexion puis réessayez.</p></div>
      <button type="button" onClick={() => void refetch()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Réessayer</button>
    </div>;
  }

  return (
    <section>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight text-white">Workflows</h1><p className="mt-1 text-sm text-slate-400">Vos workflows et leur état</p></div>
        {!creatingWorkflow ? (
          <button type="button" onClick={() => setCreatingWorkflow(true)} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"><Plus size={17} />Créer un workflow</button>
        ) : (
          <form onSubmit={handleCreate} className="flex gap-2">
            <label className="sr-only" htmlFor="new-workflow-name">Nom du workflow</label>
            <input id="new-workflow-name" value={newWorkflowName} onChange={(event) => setNewWorkflowName(event.target.value)} placeholder="Nom du workflow" autoFocus className="h-9 w-56 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" />
            <button type="submit" disabled={!newWorkflowName.trim() || createMutation.isPending} className="h-9 rounded-md bg-blue-600 px-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{createMutation.isPending ? 'Création…' : 'Créer'}</button>
            <button type="button" onClick={() => { setCreatingWorkflow(false); setNewWorkflowName(''); }} className="h-9 rounded-md border border-slate-700 px-3 text-sm text-slate-300 hover:bg-slate-700">Annuler</button>
          </form>
        )}
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1 md:max-w-[360px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un workflow…" className="h-9 w-full rounded-md border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" />
        </label>
        <label className="sr-only" htmlFor="workflow-status">Filtrer par état</label>
        <select id="workflow-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-300 focus:border-blue-500 focus:outline-none">
          <option value="all">Tous les états</option><option value="active">Actifs</option><option value="inactive">Inactifs</option>
        </select>
        <label className="sr-only" htmlFor="workflow-sort">Trier les workflows</label>
        <select id="workflow-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-300 focus:border-blue-500 focus:outline-none">
          <option value="updated">Dernière modification</option><option value="name">Nom</option><option value="created">Création</option>
        </select>
        <div className="ml-auto flex rounded-md border border-slate-700 p-0.5" aria-label="Affichage des workflows">
          <button type="button" onClick={() => updateView('cards')} aria-label="Vue en cartes" aria-pressed={viewMode === 'cards'} className={`rounded p-1.5 ${viewMode === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={16} /></button>
          <button type="button" onClick={() => updateView('list')} aria-label="Vue en liste" aria-pressed={viewMode === 'list'} className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}><List size={16} /></button>
        </div>
      </div>

      {visibleWorkflows.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 px-6 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 text-slate-400"><WorkflowIcon size={28} /></span>
          <h2 className="text-base font-semibold text-white">{search || statusFilter !== 'all' ? 'Aucun résultat' : 'Créez votre premier workflow'}</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-400">{search || statusFilter !== 'all' ? 'Modifiez la recherche ou le filtre pour afficher des workflows.' : 'Assemblez des nodes et automatisez une tâche en quelques étapes.'}</p>
          {!search && statusFilter === 'all' && <button type="button" onClick={() => setCreatingWorkflow(true)} className="mt-5 flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={17} />Créer un workflow</button>}
        </div>
      ) : (
        <div className={viewMode === 'cards' ? 'grid gap-4 md:grid-cols-2' : 'overflow-hidden rounded-xl border border-slate-700'}>
          {visibleWorkflows.map((workflow) => {
            const status = latestStatus(workflow);
            const action = (callback: () => void) => (event: React.MouseEvent) => { event.stopPropagation(); callback(); };
            return (
              <article key={workflow.id} className={`group relative min-w-0 border border-slate-700 bg-slate-800 transition-colors hover:border-slate-600 ${viewMode === 'cards' ? 'rounded-xl p-5' : 'flex items-center gap-4 border-x-0 border-t-0 p-3.5 last:border-b-0'}`}>
                <button type="button" onClick={() => navigate(`/workflows/${workflow.id}`)} className={`min-w-0 text-left ${viewMode === 'list' ? 'flex flex-1 items-center gap-5' : 'block w-full'}`}>
                  <span className="block truncate text-base font-semibold text-white group-hover:text-blue-400">{workflow.name}</span>
                  <span className={`mt-1 block text-xs text-slate-400 ${viewMode === 'list' ? 'min-w-48' : ''}`}>Modifié {relativeDate(workflow.updated_at)} · Créé le {new Date(workflow.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className={`mt-3 flex items-center gap-2 text-xs ${status.tone} ${viewMode === 'list' ? 'mt-0 min-w-36' : ''}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status.label}</span>
                </button>
                <div className={`flex items-center gap-2 ${viewMode === 'cards' ? 'mt-4 justify-between border-t border-slate-700 pt-3' : 'shrink-0'}`}>
                  <button type="button" onClick={action(() => toggleActiveMutation.mutate({ id: workflow.id, active: workflow.active }))} role="switch" aria-checked={workflow.active} aria-label={workflow.active ? 'Désactiver le workflow' : 'Activer le workflow'} title={workflow.active ? 'Désactiver' : 'Activer'} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${workflow.active ? 'border-emerald-500/40 text-emerald-400' : 'border-slate-700 text-slate-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${workflow.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />{workflow.active ? 'Actif' : 'Inactif'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={action(() => navigate(`/workflows/${workflow.id}`))} className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Ouvrir le workflow" title="Ouvrir"><Play size={16} /></button>
                    <details className="details-menu">
                      <summary className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Actions du workflow" title="Plus d’actions"><MoreHorizontal size={17} /></summary>
                      <div>
                        <button type="button" onClick={action(() => duplicateMutation.mutate(workflow.id))}><Copy size={14} className="mr-2 inline" />Dupliquer</button>
                        <button type="button" onClick={action(() => deleteWorkflow(workflow))} className="text-red-400"><Trash2 size={14} className="mr-2 inline" />Supprimer</button>
                      </div>
                    </details>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
