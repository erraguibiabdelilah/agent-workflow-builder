import { useMemo } from 'react';
import { useWorkflowStore } from '../../../stores/workflow-store';
import { useRunStore } from '../../../stores/run-store';
export function useNodeVisualState(nodeId: string, nodeType: string) {
  const description = useWorkflowStore((state) => state.nodeTypes.find((item) => item.type === nodeType));
  const validationIssues = useWorkflowStore((state) => state.validationIssues);
  const runState = useRunStore((state) => state.nodeStates[nodeId]);
  const nodeIssues = useMemo(() => validationIssues.filter((issue) => issue.nodeId === nodeId), [nodeId, validationIssues]);
  const validationMessage = nodeIssues.length
    ? nodeIssues.map((issue) => `${issue.level === 'error' ? 'Erreur' : 'Avertissement'} : ${issue.message}`).join('\n')
    : undefined;
  const statusMessage = validationMessage ?? runState?.error?.message ?? runState?.warning;
  const status = nodeIssues.some((issue) => issue.level === 'error')
    ? 'error'
    : nodeIssues.length > 0
      ? 'warning'
      : runState?.status ?? 'idle';

  return useMemo(() => ({ description, status, validationMessage: statusMessage }), [description, status, statusMessage]);
}
