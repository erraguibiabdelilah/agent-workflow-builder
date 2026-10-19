import type { NodeCategory, NodeTypeDescription } from '../../../../shared/src/node-types';
import type { PaletteRequest } from '../../../stores/workflow-store';

export type PaletteCategory = NodeCategory | 'ai-group' | 'all';

export const PALETTE_CATEGORIES: { value: PaletteCategory; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'trigger', label: 'Triggers' },
  { value: 'ai', label: 'IA' },
  { value: 'logic', label: 'Logique' },
  { value: 'action', label: 'Actions' },
  { value: 'tool', label: 'Outils' },
  { value: 'model', label: 'Modèles' },
  { value: 'memory', label: 'Mémoire' },
];

export function filterNodeTypes(
  descriptions: NodeTypeDescription[],
  query: string,
  category: PaletteCategory,
  request: PaletteRequest | null,
): NodeTypeDescription[] {
  const search = normalizeSearch(query.trim());
  return descriptions.filter((description) => {
    if (request?.mode === 'trigger' && description.category !== 'trigger') return false;
    if (category === 'ai-group' && !['ai', 'model', 'memory', 'tool'].includes(description.category)) return false;
    if (category !== 'all' && category !== 'ai-group' && description.category !== category) return false;
    if (search && !normalizeSearch(`${description.displayName} ${description.description} ${description.type}`).includes(search)) return false;

    if (request?.mode === 'accept-output') {
      if (!request.handleType || !description.outputs.some((port) => port.type === request.handleType)) return false;
    }
    if (request?.mode === 'accept-input') {
      if (!request.handleType || description.kind === 'trigger' || !description.inputs.some((port) => port.type === request.handleType)) return false;
    }
    return true;
  });
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
