import type { AgentTrace } from '../../../lib/api';

interface TraceTabProps {
  traces: AgentTrace[];
  onSelectTool?: (toolName: string) => void;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function TraceTab({ traces, onSelectTool }: TraceTabProps) {
  if (traces.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucune trace disponible pour cette exécution.</p>;
  }

  return (
    <div className="space-y-4 text-[var(--text)]">
      {traces.map((trace, traceIndex) => (
        <section key={`${trace.provider}-${trace.model}-${traceIndex}`} className="space-y-3">
          {traces.length > 1 && <h3 className="text-xs font-semibold text-[var(--text-muted)]">Élément {traceIndex + 1}</h3>}
          <dl className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-input)] p-3 text-xs">
            <dt className="text-[var(--text-muted)]">Modèle</dt><dd className="truncate text-right">{trace.model}</dd>
            <dt className="text-[var(--text-muted)]">Fournisseur</dt><dd className="text-right">{trace.provider}</dd>
            <dt className="text-[var(--text-muted)]">Itérations</dt><dd className="text-right">{trace.iterations}</dd>
            <dt className="text-[var(--text-muted)]">Fin</dt><dd className="truncate text-right">{trace.finishReason}</dd>
            <dt className="text-[var(--text-muted)]">Tokens en entrée</dt><dd className="text-right">{trace.usage.inputTokens}</dd>
            <dt className="text-[var(--text-muted)]">Tokens en sortie</dt><dd className="text-right">{trace.usage.outputTokens}</dd>
          </dl>
          {trace.warning && <p className="rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-2 text-xs text-[var(--warning)]">{trace.warning}</p>}

          <ol className="space-y-3">
            {trace.steps.map((step) => (
              <li key={step.index} className="space-y-2 border-l-2 border-[var(--border-strong)] pl-3">
                <h4 className="text-xs font-semibold text-[var(--text-muted)]">Étape {step.index}</h4>
                {step.toolCalls.map((call, callIndex) => {
                  const result = step.toolResults.find((item) => item.toolName === call.toolName);
                  return (
                    <div key={`${call.toolName}-${callIndex}`} className="space-y-2 rounded-md border border-[var(--border)] p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">Outil : {call.toolName}</p>
                        {onSelectTool && <button type="button" onClick={() => onSelectTool(call.toolName)} className="rounded border border-[var(--border-strong)] px-2 py-1 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">Afficher le node</button>}
                      </div>
                      <div><p className="mb-1 text-[var(--text-muted)]">Paramètres</p><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-[var(--bg-input)] p-2">{stringify(call.input)}</pre></div>
                      <div>
                        <p className={result?.error ? 'mb-1 text-[var(--danger)]' : 'mb-1 text-[var(--text-muted)]'}>{result?.error ? 'Erreur' : 'Résultat'}</p>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-[var(--bg-input)] p-2">{result?.error ?? stringify(result?.output)}</pre>
                      </div>
                    </div>
                  );
                })}
                {step.text && <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--bg-input)] p-2 text-xs">{step.text}</pre>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
