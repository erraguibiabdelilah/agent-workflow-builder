import type { WorkflowNode } from '../../../../shared/src/workflow';

interface CommonSettingsProps {
  node: WorkflowNode;
  onChange: (settings: Partial<WorkflowNode>) => void;
}

export function CommonSettings({ node, onChange }: CommonSettingsProps) {
  return (
    <section className="border-t border-slate-700 pt-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Paramètres communs</h3>
      <div className="space-y-4">
        <label className="block text-sm text-slate-300">
          En cas d’erreur
          <select value={node.onError ?? 'stop'} onChange={(event) => onChange({ onError: event.target.value as WorkflowNode['onError'] })} className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
            <option value="stop">Arrêter le workflow</option>
            <option value="continue">Continuer</option>
          </select>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={node.retryOnFail ?? false} onChange={(event) => onChange({ retryOnFail: event.target.checked })} className="h-4 w-4 accent-sky-500" />
          Réessayer en cas d’échec
        </label>

        {node.retryOnFail && <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-400">
            Tentatives max (1–3)
            <input type="number" min={1} max={3} value={node.maxTries ?? 1} onChange={(event) => onChange({ maxTries: event.target.value === '' ? undefined : Math.min(3, Math.max(1, Number(event.target.value))) })} className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-slate-100" />
          </label>
          <label className="block text-xs text-slate-400">
            Délai (ms)
            <input type="number" min={1} value={node.retryDelayMs ?? 1000} onChange={(event) => onChange({ retryDelayMs: event.target.value === '' ? undefined : Math.max(1, Number(event.target.value)) })} className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-slate-100" />
          </label>
        </div>}

        <label className="block text-sm text-slate-300">
          Timeout (ms)
          <input type="number" min={1} value={node.timeoutMs ?? 60000} onChange={(event) => onChange({ timeoutMs: event.target.value === '' ? undefined : Math.max(1, Number(event.target.value)) })} className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
        </label>

        <label className="block text-sm text-slate-300">
          Notes
          <textarea value={node.notes ?? ''} onChange={(event) => onChange({ notes: event.target.value || undefined })} rows={3} placeholder="Ajouter une note sur ce node…" className="mt-1.5 w-full resize-y rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500" />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={node.disabled ?? false} onChange={(event) => onChange({ disabled: event.target.checked })} className="h-4 w-4 accent-sky-500" />
          Désactiver ce node
        </label>
      </div>
    </section>
  );
}
