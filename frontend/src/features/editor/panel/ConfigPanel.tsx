import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { credentials, executions } from '../../../lib/api';
import type { NodeProperty } from '../../../../shared/src/node-types';
import { useWorkflowStore } from '../../../stores/workflow-store';
import { CredentialSelector } from './CredentialSelector';
import { CommonSettings } from './CommonSettings';
import { PropertyField } from './PropertyField';
import { TraceTab } from './TraceTab';
import { useRunStore } from '../../../stores/run-store';

export function ConfigPanel() {
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const nodeTypes = useWorkflowStore((state) => state.nodeTypes);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const updateNodeParams = useWorkflowStore((state) => state.updateNodeParams);
  const updateNodeSettings = useWorkflowStore((state) => state.updateNodeSettings);
  const updateNodeCredential = useWorkflowStore((state) => state.updateNodeCredential);
  const renameNode = useWorkflowStore((state) => state.renameNode);
  const executionId = useRunStore((state) => state.executionId);
  const executionStatus = useRunStore((state) => state.executionStatus);
  const [activeTab, setActiveTab] = useState<'parameters' | 'trace'>('parameters');
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const node = nodes.find((item) => item.id === selectedNodeId);
  const nodeDefinition = node?.data.workflowNode;
  const description = node && nodeTypes.find((item) => item.type === node.data.type);
  const hasCredentials = !!description?.credentials?.length || !!description?.properties.some((property) => property.type === 'credential');
  const credentialQuery = useQuery({
    queryKey: ['credentials'],
    queryFn: credentials.list,
    enabled: !!node && hasCredentials,
  });
  const credentialsList = credentialQuery.data ?? [];
  const traceQuery = useQuery({
    queryKey: ['execution-node', executionId, node?.id],
    queryFn: () => executions.getNode(executionId!, node!.id),
    enabled: !!node && node.data.type === 'agent' && !!executionId,
    refetchInterval: executionStatus === 'running' ? 1000 : false,
  });

  useEffect(() => {
    setActiveTab('parameters');
  }, [node?.id]);

  useEffect(() => {
    if (executionStatus === 'success' || executionStatus === 'error') {
      void traceQuery.refetch();
    }
  }, [executionId, executionStatus]);

  useEffect(() => {
    setNameDraft(node?.data.name ?? '');
    setNameError(null);
  }, [node?.id, node?.data.name]);

  const nodeNames = useMemo(() => nodes.filter((item) => item.id !== node?.id).map((item) => item.data.name), [node?.id, nodes]);

  if (!node || !nodeDefinition) return null;

  const commitName = () => {
    const normalized = nameDraft.trim();
    if (!normalized) {
      setNameError('Le nom ne peut pas être vide.');
      return;
    }
    if (normalized === node.data.name) {
      setNameError(null);
      return;
    }
    if (nodeNames.includes(normalized)) {
      setNameError('Ce nom est déjà utilisé dans le workflow.');
      return;
    }
    try {
      renameNode(node.id, normalized);
      setNameError(null);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : 'Impossible de renommer ce node.');
    }
  };

  const setParameter = (name: string, value: unknown) => {
    updateNodeParams(node.id, { ...node.data.parameters, [name]: value });
  };

  const propertyCredentialType = (property: NodeProperty) => property.credentialType ?? property.name;
  const getCredentialId = (credentialType: string) => {
    const entry = Object.entries(nodeDefinition.credentials ?? {}).find(
      ([type]) => type.toLowerCase() === credentialType.toLowerCase(),
    );
    return typeof entry?.[1] === 'string' ? entry[1] : '';
  };

  const selectToolNode = (toolName: string) => {
    const connectedToolIds = new Set(edges
      .filter((edge) => edge.target === node.id && edge.targetHandle?.startsWith('ai_tool:'))
      .map((edge) => edge.source));
    const toolNode = nodes.find((candidate) => connectedToolIds.has(candidate.id)
      && candidate.data.workflowNode.parameters.toolName === toolName);
    if (toolNode) {
      selectNode(toolNode.id);
    }
  };

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-slate-700 bg-slate-900" aria-label="Configuration du node">
      <header className="border-b border-slate-700 px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configuration</span>
          <button type="button" onClick={() => selectNode(null)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fermer le panneau">
            <X size={17} />
          </button>
        </div>
        <label className="block text-xs text-slate-500" htmlFor="config-node-name">Nom du node</label>
        <input
          id="config-node-name"
          value={nameDraft}
          onChange={(event) => { setNameDraft(event.target.value); setNameError(null); }}
          onBlur={commitName}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          disabled={!description}
          className={`mt-1 w-full rounded-md border bg-slate-800 px-3 py-2 text-base font-semibold text-white outline-none focus:border-sky-500 ${nameError ? 'border-red-500' : 'border-slate-700'}`}
        />
        {nameError && <p role="alert" className="mt-1 text-xs text-red-400">{nameError}</p>}
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-slate-800 px-2 py-1">{description?.displayName ?? 'Type inconnu'}</span>
          <code>{node.data.type}</code>
        </div>
      </header>

      {description ? (
        <>
          <div className="border-b border-slate-700 px-4 pt-3">
            <div role="tablist" aria-label="Sections de configuration" className="flex">
              <button type="button" role="tab" aria-selected={activeTab === 'parameters'} onClick={() => setActiveTab('parameters')} className={`border-b-2 px-2 pb-2 text-sm font-medium ${activeTab === 'parameters' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>Paramètres</button>
              {node.data.type === 'agent' && <button type="button" role="tab" aria-selected={activeTab === 'trace'} onClick={() => setActiveTab('trace')} className={`border-b-2 px-2 pb-2 text-sm font-medium ${activeTab === 'trace' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>Trace</button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === 'trace' && node.data.type === 'agent' ? (
            <div className="space-y-3">
              {traceQuery.isLoading ? <p className="text-sm text-[var(--text-muted)]">Chargement de la trace…</p>
                : traceQuery.isError ? <p role="alert" className="text-sm text-[var(--danger)]">{traceQuery.error.message}</p>
                  : <TraceTab traces={traceQuery.data?.trace ?? []} onSelectTool={selectToolNode} />}
            </div>
          ) : (
          <div className="space-y-5">
            {description.properties.length === 0 && !description.credentials?.length && <p className="text-sm text-slate-500">Ce node n’a pas de paramètres configurables.</p>}

            {description.properties.map((property) => {
              const credentialType = propertyCredentialType(property);
              return <PropertyField
                key={property.name}
                property={property}
                value={property.type === 'credential' ? getCredentialId(credentialType) : node.data.parameters[property.name]}
                values={node.data.parameters}
                nodeNames={nodeNames}
                credentialsList={credentialsList}
                onChange={(value) => setParameter(property.name, value)}
                onCredentialChange={(type, credentialId) => updateNodeCredential(node.id, type, credentialId)}
                onRefreshCredentials={() => { void credentialQuery.refetch(); }}
              />;
            })}

            {!!description.credentials?.length && (
              <section className="space-y-3 border-t border-slate-700 pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Credentials</h3>
                  <p className="mt-1 text-xs text-slate-500">Les secrets sont stockés séparément des paramètres du workflow.</p>
                </div>
                {description.credentials.map((credential) => (
                  <div key={credential.type}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-200">{credential.type}{credential.required && <span className="ml-1 text-red-400">*</span>}</label>
                    <CredentialSelector
                      credentialType={credential.type}
                      value={getCredentialId(credential.type)}
                      credentialsList={credentialsList}
                      onChange={(credentialId) => updateNodeCredential(node.id, credential.type, credentialId)}
                      onRefresh={() => { void credentialQuery.refetch(); }}
                    />
                    {credential.required && !getCredentialId(credential.type) && <p className="mt-1 text-xs text-red-400">Ce credential est obligatoire.</p>}
                    {credentialQuery.isError && <p role="alert" className="mt-1 text-xs text-red-400">{credentialQuery.error.message}</p>}
                  </div>
                ))}
              </section>
            )}

            {description.kind !== 'subnode' && <CommonSettings node={nodeDefinition} onChange={(settings) => updateNodeSettings(node.id, settings)} />}
          </div>
          )}
          </div>
        </>
      ) : (
        <div className="p-4 text-sm text-amber-300">La description de ce type de node est indisponible.</div>
      )}
    </aside>
  );
}
