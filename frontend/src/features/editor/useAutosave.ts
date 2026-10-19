import { useEffect } from 'react';
import { useWorkflowStore } from '../../stores/workflow-store';

const AUTOSAVE_DELAY_MS = 1500;

export function useAutosave(onError?: (error: Error) => void) {
  const dirty = useWorkflowStore((state) => state.dirty);
  const save = useWorkflowStore((state) => state.save);
  const saveStatus = useWorkflowStore((state) => state.saveStatus);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      void save().catch((error: unknown) => {
        onError?.(error instanceof Error ? error : new Error('Échec de la sauvegarde'));
      });
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, onError, save]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save().catch((error: unknown) => {
          onError?.(error instanceof Error ? error : new Error('Échec de la sauvegarde'));
        });
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!useWorkflowStore.getState().dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [onError, save]);

  return saveStatus;
}
