import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Credential } from '../../../lib/api';
import { credentials } from '../../../lib/api';

interface CredentialInputField {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'number';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
}

const CREDENTIAL_FIELDS: Record<string, CredentialInputField[]> = {
  anthropicApi: [{ name: 'apiKey', label: 'Clé API', type: 'password', required: true }],
  openAiApi: [{ name: 'apiKey', label: 'Clé API', type: 'password', required: true }],
  googleApi: [{ name: 'apiKey', label: 'Clé API', type: 'password', required: true }],
  mistralApi: [{ name: 'apiKey', label: 'Clé API', type: 'password', required: true }],
  telegramBot: [{ name: 'botToken', label: 'Token du bot', type: 'password', required: true }],
  smtp: [
    { name: 'host', label: 'Hôte', required: true },
    { name: 'port', label: 'Port', type: 'number', defaultValue: 587 },
    { name: 'username', label: 'Identifiant' },
    { name: 'password', label: 'Mot de passe', type: 'password' },
  ],
  imap: [
    { name: 'host', label: 'Hôte', required: true },
    { name: 'port', label: 'Port', type: 'number', defaultValue: 993 },
    { name: 'username', label: 'Identifiant', required: true },
    { name: 'password', label: 'Mot de passe', type: 'password', required: true },
  ],
};

interface CredentialSelectorProps {
  credentialType: string;
  value: string;
  credentialsList: Credential[];
  onChange: (value: string) => void;
  onRefresh: () => void;
}

export function CredentialSelector({ credentialType, value, credentialsList, onChange, onRefresh }: CredentialSelectorProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [data, setData] = useState<Record<string, string | number>>(() => initialCredentialData(credentialType));
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => credentials.create({ name: name.trim(), type: credentialType, data }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['credentials'] });
      onRefresh();
      onChange(created.id);
      setCreateOpen(false);
      setName('');
    },
  });
  const testMutation = useMutation({
    mutationFn: () => credentials.test({ type: credentialType, credential_id: value }),
    onSuccess: (result) => setTestMessage(result.message),
    onError: (error: Error) => setTestMessage(error.message),
  });

  const matchingCredentials = credentialsList.filter((credential) => credential.type.toLowerCase() === credentialType.toLowerCase());
  const fields = fieldsForType(credentialType);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <select value={value} onChange={(event) => { onChange(event.target.value); setTestMessage(null); }} className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
          <option value="">Sélectionner un credential…</option>
          {matchingCredentials.map((credential) => <option key={credential.id} value={credential.id}>{credential.name}{credential.hint ? ` · ${credential.hint}` : ''}</option>)}
        </select>
        <button type="button" onClick={() => { setData(initialCredentialData(credentialType)); setName(''); createMutation.reset(); setCreateOpen(true); }} className="shrink-0 rounded border border-slate-600 px-2 text-xs text-slate-200 hover:bg-slate-700">Créer</button>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>{matchingCredentials.length ? `${matchingCredentials.length} disponible${matchingCredentials.length === 1 ? '' : 's'}` : 'Aucun credential de ce type'}</span>
        {value && <button type="button" onClick={() => { setTestMessage(null); testMutation.mutate(); }} disabled={testMutation.isPending} className="text-sky-400 hover:text-sky-300 disabled:opacity-50">{testMutation.isPending ? 'Test…' : 'Tester la connexion'}</button>}
      </div>
      {testMessage && <p role="status" className={`mt-1 text-xs ${testMutation.data?.success ? 'text-emerald-400' : 'text-amber-300'}`}>{testMessage}</p>}

      {createOpen && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <form role="dialog" aria-modal="true" aria-label={`Créer un credential ${credentialType}`} onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }} className="w-full max-w-md space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Nouveau credential · {credentialType}</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-xs text-slate-400 hover:text-white">Fermer</button>
            </div>
            <label className="block text-xs text-slate-300">Nom
              <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Mon credential" className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-white" />
            </label>
            {fields.map((field) => (
              <label key={field.name} className="block text-xs text-slate-300">{field.label}{field.required ? ' *' : ''}
                <input type={field.type ?? 'text'} required={field.required} min={field.type === 'number' ? 1 : undefined} value={data[field.name] ?? ''} onChange={(event) => setData((current) => ({ ...current, [field.name]: field.type === 'number' ? Number(event.target.value) : event.target.value }))} placeholder={field.placeholder} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-white" />
              </label>
            ))}
            {createMutation.error && <p role="alert" className="text-xs text-red-400">{createMutation.error.message}</p>}
            <button type="submit" disabled={createMutation.isPending || !name.trim()} className="w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50">
              {createMutation.isPending ? 'Création…' : 'Créer et sélectionner'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function fieldsForType(type: string): CredentialInputField[] {
  return CREDENTIAL_FIELDS[type] ?? [{ name: 'apiKey', label: 'Clé ou secret', type: 'password', required: true }];
}

function initialCredentialData(type: string): Record<string, string | number> {
  return Object.fromEntries(fieldsForType(type).map((field) => [field.name, field.defaultValue ?? '']));
}
