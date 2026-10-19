import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type EdgeTypes, type NodeTypes } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, Loader2, MoreHorizontal, Play, Plus, ToggleLeft } from 'lucide-react';
import { executions, nodeTypes, workflows } from '../../lib/api';
import { streamExecution } from '../../lib/sse';
import { useWorkflowStore } from '../../stores/workflow-store';
import { useRunStore } from '../../stores/run-store';
import { validateWorkflow } from '../../../shared/src/validate-workflow';
import { AgentNode } from './nodes/AgentNode';
import { RegularNode } from './nodes/RegularNode';
import { SubNodeCircle } from './nodes/SubNodeCircle';
import { TriggerNode } from './nodes/TriggerNode';
import { UnknownNode } from './nodes/UnknownNode';
import { WorkflowEdge } from './edges/WorkflowEdge';
import { isValidConnection } from './connection-rules';
import { flowToWorkflow, type WorkflowFlowEdge, type WorkflowFlowNode } from './serialization';
import { useAutosave } from './useAutosave';
import { Palette } from './palette/Palette';
import { handleId, indexInputPorts, indexOutputPorts } from './nodes/ports';

const canvasNodeTypes: NodeTypes = {
  trigger: TriggerNode,
  regular: RegularNode,
  agent: AgentNode,
  subnode: SubNodeCircle,
  unknown: UnknownNode,
};

const canvasEdgeTypes: EdgeTypes = { workflow: WorkflowEdge };
const ConfigPanel = lazy(() => import('./panel/ConfigPanel').then((module) => ({ default: module.ConfigPanel })));

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const workflow = useWorkflowStore((state) => state.workflow);
  const openPalette = useWorkflowStore((state) => state.openPalette);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const updateWorkflowName = useWorkflowStore((state) => state.updateWorkflowName);
  const saveStatus = useAutosave(useCallback((error: Error) => setSaveError(error.message), []));
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
  const dirty = useWorkflowStore((state) => state.dirty);
  const [workflowNameDraft, setWorkflowNameDraft] = useState(workflow?.name ?? '');
  const [workflowNameError, setWorkflowNameError] = useState<string | null>(null);

  useEffect(() => {
    setWorkflowNameDraft(workflow?.name ?? '');
    setWorkflowNameError(null);
  }, [workflow?.id, workflow?.name]);

  const commitWorkflowName = () => {
    if (!workflow) return;
    const normalized = workflowNameDraft.trim();
    if (!normalized) {
      setWorkflowNameError('Le nom du workflow ne peut pas être vide.');
      return;
    }
    if (normalized === workflow.name) {
      setWorkflowNameDraft(normalized);
      setWorkflowNameError(null);
      return;
    }
    try {
      updateWorkflowName(normalized);
      setWorkflowNameDraft(normalized);
      setWorkflowNameError(null);
    } catch (error) {
      setWorkflowNameError(error instanceof Error ? error.message : 'Impossible de renommer le workflow.');
    }
  };

  const workflowQuery = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflows.get(id!),
    enabled: !!id,
  });
  const nodeTypesQuery = useQuery({
    queryKey: ['node-types'],
    queryFn: nodeTypes.list,
  });

  useEffect(() => {
    if (workflowQuery.data && nodeTypesQuery.data) {
      setWorkflow(workflowQuery.data, nodeTypesQuery.data);
    }
  }, [nodeTypesQuery.data, setWorkflow, workflowQuery.data]);

  const retry = () => {
    void Promise.all([workflowQuery.refetch(), nodeTypesQuery.refetch()]);
  };

  if (workflowQuery.isLoading || nodeTypesQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center text-slate-400">
        Chargement du workflow...
      </div>
    );
  }

  if (workflowQuery.isError || nodeTypesQuery.isError || !workflow) {
    return (
      <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-4 text-slate-300">
        <p className="text-red-400">
          {workflowQuery.error?.message ?? nodeTypesQuery.error?.message ?? 'Workflow introuvable'}
        </p>
        <button className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600" onClick={retry}>
          Réessayer
        </button>
      </div>
    );
  }

  const saveLabel = {
    saved: 'Enregistré',
    saving: 'Enregistrement…',
    dirty: 'Non enregistré',
    error: 'Erreur de sauvegarde',
  }[saveStatus];

  const saveNow = async () => {
    try {
      await useWorkflowStore.getState().save();
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Impossible d’enregistrer le workflow.');
    }
  };

  return (
    <ReactFlowProvider>
      <div className="editor-shell flex min-h-0 flex-col gap-2">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-1">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link to="/" className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white" title="Retour aux workflows" aria-label="Retour aux workflows"><ArrowLeft size={17} /></Link>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1 text-xs text-slate-500"><Link to="/" className="hover:text-slate-300">Workflows</Link><span>/</span><label className="sr-only" htmlFor="workflow-name">Nom du workflow</label><input id="workflow-name" value={workflowNameDraft} onChange={(event) => { setWorkflowNameDraft(event.target.value); setWorkflowNameError(null); }} onBlur={commitWorkflowName} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setWorkflowNameDraft(workflow.name); setWorkflowNameError(null); } }} aria-invalid={!!workflowNameError} aria-describedby={workflowNameError ? 'workflow-name-error' : undefined} className={`min-w-0 max-w-[min(34vw,360px)] truncate border-b border-transparent bg-transparent px-1 py-1 text-sm font-semibold text-white outline-none focus:border-blue-400 ${workflowNameError ? 'border-red-500' : ''}`} /></div>
              {workflowNameError && <p id="workflow-name-error" role="alert" className="px-1 text-[11px] text-red-400">{workflowNameError}</p>}
            </div>
          </div>
          <nav className="flex h-9 items-center rounded-md border border-slate-700 p-0.5 text-xs" aria-label="Workflow sections">
            <span aria-current="page" className="rounded bg-slate-700 px-3 py-1.5 font-medium text-white">Éditeur</span>
            <Link to={`/workflows/${workflow.id}/executions`} className="rounded px-3 py-1.5 text-slate-400 hover:text-white">Exécutions</Link>
          </nav>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <span className={`flex items-center gap-1.5 whitespace-nowrap text-xs ${saveStatus === 'error' ? 'text-red-400' : saveStatus === 'dirty' ? 'text-amber-400' : 'text-slate-400'}`} aria-live="polite">
              {saveStatus === 'saved' ? <Check size={14} className="text-emerald-400" /> : saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{saveLabel}
            </span>
            <button type="button" onClick={() => void saveNow()} disabled={!dirty || saveStatus === 'saving'} className="h-8 rounded-md border border-slate-600 px-3 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Enregistrer</button>
            <span title="L’activation sera disponible dans la spec 05."><button type="button" role="switch" aria-checked="false" disabled className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-slate-500" aria-label="Actif (bientôt disponible)"><ToggleLeft size={16} />Actif</button></span>
            <details className="details-menu"><summary className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Actions du workflow" title="Actions du workflow"><MoreHorizontal size={17} /></summary><div><Link to={`/workflows/${workflow.id}/executions`} className="block rounded-md p-2 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white">Historique des exécutions</Link></div></details>
          </div>
        </header>

        {saveError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{saveError}</p>}

        <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
          <div className="min-w-0 flex-1"><EditorCanvas /></div>
          {selectedNodeId && <Suspense fallback={<aside className="w-[360px] shrink-0 border-l border-slate-700 bg-slate-900" aria-label="Chargement de la configuration" />}><ConfigPanel /></Suspense>}
        </div>
      </div>
    </ReactFlowProvider>
  );
}

function EditorCanvas() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const nodeTypesFromStore = useWorkflowStore((state) => state.nodeTypes);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const validationIssues = useWorkflowStore((state) => state.validationIssues);
  const setValidationIssues = useWorkflowStore((state) => state.setValidationIssues);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const openPalette = useWorkflowStore((state) => state.openPalette);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const workflowId = useWorkflowStore((state) => state.workflow?.id);
  const executionStatus = useRunStore((state) => state.executionStatus);
  const applyRunEvent = useRunStore((state) => state.applyEvent);
  const startRun = useRunStore((state) => state.startRun);
  const failRun = useRunStore((state) => state.failRun);
  const resetRun = useRunStore((state) => state.reset);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const paletteRequest = useWorkflowStore((state) => state.paletteRequest);
  const closePalette = useWorkflowStore((state) => state.closePalette);
  const canvasRef = useRef<HTMLDivElement>(null);
  const invalidReasonRef = useRef<string | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionTooltip, setConnectionTooltip] = useState<{ x: number; y: number; reason: string } | null>(null);
  const { screenToFlowPosition } = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>();

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);
  const globalValidationIssues = useMemo(
    () => validationIssues.filter((issue) => issue.nodeId === null),
    [validationIssues],
  );
  const hasGlobalValidationError = globalValidationIssues.some((issue) => issue.level === 'error');
  const runIsActive = isStartingRun || executionStatus === 'running';

  useEffect(() => () => streamCleanupRef.current?.(), []);
  useEffect(() => resetRun(), [resetRun, workflowId]);

  const runWorkflow = async () => {
    if (!workflowId || runIsActive) return;

    setIsStartingRun(true);
    setRunError(null);
    setRunOutput(null);
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;

    try {
      await useWorkflowStore.getState().save();
      const { executionId } = await executions.execute(workflowId);
      startRun(executionId);
      streamCleanupRef.current = streamExecution(executionId, (event) => {
        applyRunEvent(event);
        if (event.type === 'node:error') {
          const failedNode = useWorkflowStore.getState().nodes.find((node) => node.id === event.nodeId);
          setRunError(`${failedNode?.data.name ?? 'Node'} : ${event.error.message}`);
          return;
        }
        if (event.type !== 'execution:finish') return;

        streamCleanupRef.current?.();
        streamCleanupRef.current = null;
        if (event.status !== 'success') {
          setRunError(event.error?.message ?? 'L’exécution du workflow a échoué.');
          return;
        }

        void (async () => {
          const agentNodes = useWorkflowStore.getState().nodes.filter((node) => node.data.type === 'agent').reverse();
          for (const agent of agentNodes) {
            try {
              const nodeResult = await executions.getNode(executionId, agent.id);
              const outputItems = Array.isArray(nodeResult.output) ? nodeResult.output.flat() : [];
              const values = outputItems.map((item: any) => item?.json?.output ?? item?.json ?? item);
              if (values.length) {
                setRunOutput(values.map((value: unknown) => typeof value === 'string' ? value : JSON.stringify(value, null, 2)).join('\n\n'));
                return;
              }
            } catch {
              // The workflow can succeed without an Agent node in the path.
            }
          }
        })();
      }, {
        onError: (error) => {
          setRunError(error.message || 'Connexion au suivi de l’exécution interrompue.');
          failRun();
          streamCleanupRef.current?.();
          streamCleanupRef.current = null;
        },
      });
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Impossible de démarrer le workflow.');
      failRun();
    } finally {
      setIsStartingRun(false);
    }
  };

  useEffect(() => {
    if (!workflow) {
      setValidationIssues([]);
      return;
    }

    const timeout = setTimeout(() => {
      const currentWorkflow = flowToWorkflow(nodes, edges, workflow);
      setValidationIssues(validateWorkflow(currentWorkflow, nodeTypesFromStore));
    }, 300);
    return () => clearTimeout(timeout);
  }, [edges, nodes, nodeTypesFromStore, setValidationIssues, workflow]);

  const validateConnection = useCallback((connection: WorkflowFlowEdge | Connection) => {
    const candidate: Connection = {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    };
    const validation = isValidConnection(candidate, nodes, edges, nodeTypesFromStore);
    invalidReasonRef.current = validation.ok ? null : validation.reason;
    return validation.ok;
  }, [edges, nodeTypesFromStore, nodes]);

  const centerPosition = useCallback(() => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
  }, [screenToFlowPosition]);

  const createFromPalette = useCallback((type: string, dropPosition?: { x: number; y: number }) => {
    const state = useWorkflowStore.getState();
    const request = state.paletteRequest;
    const description = state.nodeTypes.find((item) => item.type === type);
    if (!description) return;

    let position = dropPosition ?? centerPosition();
    if (request?.placement === 'below-target' && request.targetNodeId) {
      const targetNode = state.nodes.find((node) => node.id === request.targetNodeId);
      const targetDescription = state.nodeTypes.find((item) => item.type === targetNode?.data.type);
      const aiInputs = indexInputPorts(targetDescription?.inputs ?? []).filter((port) => port.type.startsWith('ai_'));
      const handle = request.targetHandleId?.split(':');
      const portIndex = aiInputs.findIndex((port) => port.type === handle?.[0] && port.index === Number(handle?.[1]));
      const fraction = (Math.max(0, portIndex) + 1) / (aiInputs.length + 1);
      if (targetNode) position = { x: targetNode.position.x + fraction * 250 - 32, y: targetNode.position.y + 170 };
    } else if (request?.placement === 'after-source' && request.sourceNodeId) {
      const sourceNode = state.nodes.find((node) => node.id === request.sourceNodeId);
      const sourceDescription = state.nodeTypes.find((item) => item.type === sourceNode?.data.type);
      const mainOutputs = indexOutputPorts(sourceDescription?.outputs ?? []).filter((port) => port.type === 'main');
      const handle = request.sourceHandleId?.split(':');
      const outputIndex = mainOutputs.findIndex((port) => port.index === Number(handle?.[1]));
      const fraction = (Math.max(0, outputIndex) + 1) / (mainOutputs.length + 1);
      if (sourceNode) position = { x: sourceNode.position.x + 220, y: sourceNode.position.y + fraction * 90 - 35 };
    }

    const newNodeId = state.addNode(type, position);
    if (!newNodeId) return;

    if (request?.sourceNodeId && request.sourceHandleId && request.handleType) {
      const inputPorts = indexInputPorts(description.inputs);
      const input = inputPorts.find((port) => port.type === request.handleType);
      if (input) {
        state.onConnect({
          source: request.sourceNodeId,
          target: newNodeId,
          sourceHandle: request.sourceHandleId,
          targetHandle: handleId(input.type, input.index),
        });
      }
    } else if (request?.targetNodeId && request.targetHandleId && request.handleType) {
      const outputPorts = indexOutputPorts(description.outputs);
      const output = outputPorts.find((port) => port.type === request.handleType);
      if (output) {
        state.onConnect({
          source: newNodeId,
          target: request.targetNodeId,
          sourceHandle: handleId(output.type, output.index),
          targetHandle: request.targetHandleId,
        });
      }
    }

    state.closePalette();
  }, [centerPosition]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-agentflow-node-type') || event.dataTransfer.getData('text/plain');
    if (!type) return;
    createFromPalette(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }, [createFromPalette, screenToFlowPosition]);

  useEffect(() => () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!paletteRequest) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePalette();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closePalette, paletteRequest]);

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full"
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={canvasNodeTypes}
        edgeTypes={canvasEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectOnClick
        connectionRadius={24}
        isValidConnection={validateConnection}
        onConnectStart={() => {
          invalidReasonRef.current = null;
          setConnectionTooltip(null);
          if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        }}
        onConnectEnd={(event, connectionState) => {
          if (connectionState.isValid || !invalidReasonRef.current) return;
          const nativeEvent = event as MouseEvent | TouchEvent;
          const point = 'changedTouches' in nativeEvent ? nativeEvent.changedTouches[0] : nativeEvent;
          const bounds = canvasRef.current?.getBoundingClientRect();
          setConnectionTooltip({
            x: Math.max(8, (point?.clientX ?? 0) - (bounds?.left ?? 0) + 12),
            y: Math.max(8, (point?.clientY ?? 0) - (bounds?.top ?? 0) + 12),
            reason: invalidReasonRef.current,
          });
          if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
          tooltipTimeoutRef.current = setTimeout(() => setConnectionTooltip(null), 3000);
        }}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={1.8}
        className="workflow-canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="var(--canvas-dot)" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => node.id === selectedNode?.id ? 'var(--primary)' : 'var(--border-strong)'}
          maskColor="rgb(var(--bg-canvas-rgb) / 65%)"
          className="!border !border-slate-700 !bg-slate-900"
        />
      </ReactFlow>
      <button type="button" onClick={() => openPalette()} className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-300 shadow-sm hover:border-blue-400 hover:text-white" aria-label="Ajouter un node" title="Ajouter un node"><Plus size={17} /></button>
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center pb-6 text-center">
          <button type="button" onClick={() => openPalette({ mode: 'trigger' })} className="canvas-empty-card pointer-events-auto flex h-[100px] w-[100px] items-center justify-center rounded-xl transition-colors" aria-label="Ajouter le premier déclencheur"><Plus size={28} /></button>
          <h2 className="mt-4 text-sm font-semibold text-slate-200">Ajouter le premier déclencheur</h2>
          <p className="mt-1 text-xs text-slate-500">Un déclencheur démarre le workflow</p>
        </div>
      )}
      {(runError || runOutput || executionStatus === 'success' || executionStatus === 'error') && (
        <div className="absolute bottom-[4.25rem] left-1/2 z-20 w-[min(42rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-sm shadow-xl backdrop-blur">
          {runError && <p role="alert" className="whitespace-pre-wrap text-red-300">{runError}</p>}
          {!runError && runOutput && <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Réponse de l’agent</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-slate-100">{runOutput}</pre></div>}
          {!runError && !runOutput && executionStatus === 'success' && <p role="status" className="text-emerald-300">Workflow exécuté avec succès.</p>}
        </div>
      )}
      <button type="button" onClick={() => void runWorkflow()} disabled={runIsActive || !workflowId} aria-busy={runIsActive} className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{runIsActive ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}{runIsActive ? 'Exécution…' : 'Exécuter le workflow'}</button>
      {connectionTooltip && (
        <div role="status" className="pointer-events-none absolute z-50 max-w-72 rounded-md border border-amber-500/50 bg-slate-900 px-3 py-2 text-xs text-amber-100 shadow-xl" style={{ left: connectionTooltip.x, top: connectionTooltip.y }}>
          {connectionTooltip.reason}
        </div>
      )}
      {globalValidationIssues.length > 0 && (
        <div
          role={hasGlobalValidationError ? 'alert' : 'status'}
          aria-live={hasGlobalValidationError ? 'assertive' : 'polite'}
          className={`pointer-events-none absolute left-4 right-4 top-4 z-30 rounded-md border px-3 py-2 text-sm shadow-lg ${hasGlobalValidationError ? 'border-red-500/50 bg-red-950/90 text-red-100' : 'border-amber-500/50 bg-amber-950/90 text-amber-100'}`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <ul className="space-y-1">
              {globalValidationIssues.map((issue, index) => <li key={`${issue.message}-${index}`}>{issue.message}</li>)}
            </ul>
          </div>
        </div>
      )}
      {paletteRequest && <Palette nodeTypes={nodeTypesFromStore} request={paletteRequest} onSelect={(type) => createFromPalette(type)} onClose={closePalette} />}
    </div>
  );
}
