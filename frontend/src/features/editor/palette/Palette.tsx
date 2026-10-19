import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
import type { NodeTypeDescription } from '../../../../shared/src/node-types';
import type { PaletteCategory } from './palette-filter';
import type { PaletteRequest } from '../../../stores/workflow-store';
import { getNodeIcon } from '../icons';
import { filterNodeTypes, normalizeSearch } from './palette-filter';

const CATEGORY_GROUPS: { value: PaletteCategory; label: string; description: string }[] = [
  { value: 'trigger', label: 'Déclencheurs', description: 'Démarrer le workflow' },
  { value: 'ai-group', label: 'IA', description: 'Agents, modèles, mémoire et outils' },
  { value: 'logic', label: 'Logique', description: 'Conditions et branchements' },
  { value: 'action', label: 'Actions', description: 'Traiter et envoyer des données' },
];

const TYPE_LABELS: Record<string, string> = {
  ai_languageModel: 'un modèle de chat', ai_memory: 'une mémoire', ai_tool: 'un outil',
};

interface PaletteProps {
  nodeTypes: NodeTypeDescription[];
  request: PaletteRequest | null;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function Palette({ nodeTypes, request, onSelect, onClose }: PaletteProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PaletteCategory>('all');
  const search = normalizeSearch(query.trim());
  const activeCategory = search ? 'all' : category;
  const results = useMemo(() => filterNodeTypes(nodeTypes, query, activeCategory, request), [activeCategory, nodeTypes, query, request]);
  const showingCategories = !search && category === 'all' && !request?.mode;
  const title = request?.mode === 'trigger'
    ? 'Quel événement déclenche ce workflow ?'
    : request?.mode === 'accept-output'
      ? `Choisir ${TYPE_LABELS[request.handleType ?? ''] ?? 'une sortie'}`
      : request?.mode === 'accept-input'
        ? 'Que se passe-t-il ensuite ?'
        : category === 'all' ? 'Que se passe-t-il ensuite ?' : CATEGORY_GROUPS.find((item) => item.value === category)?.label ?? 'Ajouter un node';

  return (
    <aside className="floating-panel absolute inset-y-0 right-0 z-30 flex w-[min(400px,94%)] flex-col border-l shadow-2xl" aria-label="Créateur de nodes">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {category !== 'all' && request?.mode !== 'trigger' && request?.mode !== 'accept-output' && (
            <button type="button" onClick={() => setCategory('all')} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Retour aux catégories"><ArrowLeft size={16} /></button>
          )}
          <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Fermer le créateur"><X size={17} /></button>
      </div>
      <label className="relative mx-4 mt-4 block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher des nodes…" className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500" />
      </label>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {showingCategories ? (
          <div className="space-y-1">
            {CATEGORY_GROUPS.map((item) => <button type="button" key={item.value} onClick={() => setCategory(item.value)} className="flex min-h-14 w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-700"><span><span className="block text-sm font-medium text-white">{item.label}</span><span className="block text-xs text-slate-500">{item.description}</span></span><ChevronRight size={17} className="text-slate-500" /></button>)}
          </div>
        ) : results.length ? (
          <div className="space-y-1">
            {results.map((description) => {
              const Icon = getNodeIcon(description.icon);
              return <button
                type="button"
                key={description.type}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-agentflow-node-type', description.type);
                  event.dataTransfer.setData('text/plain', description.type);
                  event.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onSelect(description.type)}
                className="group flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-100" style={{ color: description.color }}><Icon size={19} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{description.displayName}</span><span className="block truncate text-xs text-slate-400">{description.description}</span></span>
              </button>;
            })}
          </div>
        ) : <p className="px-3 py-10 text-center text-sm text-slate-500">Aucun node correspondant.</p>}
      </div>
    </aside>
  );
}
