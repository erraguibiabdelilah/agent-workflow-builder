interface ExpressionHelpProps {
  nodeNames: string[];
}

export function ExpressionHelp({ nodeNames }: ExpressionHelpProps) {
  return (
    <details className="mt-2 rounded-md border border-slate-700/80 bg-slate-900/60 px-2.5 py-2 text-xs text-slate-400">
      <summary className="cursor-pointer select-none text-sky-400 hover:text-sky-300">Aide sur les expressions <code>{'{{ }}'}</code></summary>
      <div className="mt-2 space-y-2">
        <p>Les expressions sont évaluées pour chaque item entrant.</p>
        <code className="block rounded bg-slate-950 px-2 py-1.5 text-slate-200">{'{{ $json }}'} <span className="text-slate-500">— item courant</span></code>
        <code className="block rounded bg-slate-950 px-2 py-1.5 text-slate-200">{'{{ $trigger.json }}'} <span className="text-slate-500">— données du trigger</span></code>
        <div>
          <span className="mb-1 block">Référencer un autre node :</span>
          {nodeNames.length ? nodeNames.map((name) => (
            <code key={name} className="mb-1 block break-all rounded bg-slate-950 px-2 py-1.5 text-slate-200">{'{{ $node["'}{name}{'"].json }}'}</code>
          )) : <code className="block rounded bg-slate-950 px-2 py-1.5 text-slate-200">{'{{ $node["Nom du node"].json }}'}</code>}
        </div>
      </div>
    </details>
  );
}
