import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, KeyRound, Mail, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { credentials, type Credential } from '../../lib/api';

type CredentialField = { name: string; label: string; placeholder?: string; type?: 'text' | 'password' | 'number' };
type CredentialDefinition = { type: string; name: string; description: string; icon: typeof KeyRound; fields: CredentialField[] };

const CREDENTIAL_TYPES: CredentialDefinition[] = [
  { type: 'openaiApi', name: 'OpenAI API', description: 'Clé API pour les modèles GPT', icon: Bot, fields: [{ name: 'apiKey', label: 'Clé API', type: 'password', placeholder: 'sk-…' }] },
  { type: 'anthropicApi', name: 'Anthropic API', description: 'Clé API pour les modèles Claude', icon: Bot, fields: [{ name: 'apiKey', label: 'Clé API', type: 'password', placeholder: 'sk-ant-…' }] },
  { type: 'googleApi', name: 'Google AI', description: 'Clé API pour les modèles Gemini', icon: Bot, fields: [{ name: 'apiKey', label: 'Clé API', type: 'password' }] },
  { type: 'mistralApi', name: 'Mistral AI', description: 'Clé API pour les modèles Mistral', icon: Bot, fields: [{ name: 'apiKey', label: 'Clé API', type: 'password' }] },
  { type: 'telegramBot', name: 'Telegram Bot', description: 'Token d’accès du bot', icon: KeyRound, fields: [{ name: 'token', label: 'Token du bot', type: 'password' }] },
  { type: 'smtp', name: 'SMTP', description: 'Compte pour envoyer des e-mails', icon: Mail, fields: [{ name: 'host', label: 'Serveur SMTP' }, { name: 'port', label: 'Port', type: 'number' }, { name: 'username', label: 'Nom d’utilisateur' }, { name: 'password', label: 'Mot de passe', type: 'password' }] },
  { type: 'imap', name: 'IMAP', description: 'Compte pour recevoir des e-mails', icon: Mail, fields: [{ name: 'host', label: 'Serveur IMAP' }, { name: 'port', label: 'Port', type: 'number' }, { name: 'username', label: 'Nom d’utilisateur' }, { name: 'password', label: 'Mot de passe', type: 'password' }] },
];

function CredentialDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(CREDENTIAL_TYPES[0].type);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [data, setData] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const definition = CREDENTIAL_TYPES.find((type) => type.type === selectedType) ?? CREDENTIAL_TYPES[0];
  const filteredTypes = CREDENTIAL_TYPES.filter((type) => `${type.name} ${type.description}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  const getCredentialData = () => Object.fromEntries(definition.fields.map((field) => [
    field.name,
    field.type === 'number' ? Number(data[field.name]) : data[field.name] ?? '',
  ]));

  const saveMutation = useMutation({
    mutationFn: () => credentials.create({ name: name.trim(), type: selectedType, data: getCredentialData() }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['credentials'] }); onClose(); },
  });
  const testMutation = useMutation({
    mutationFn: () => credentials.test({ type: selectedType, data: getCredentialData() }),
    onSuccess: setTestResult,
    onError: (error) => setTestResult({ success: false, message: error instanceof Error ? error.message : 'Le test a échoué.' }),
  });

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstInput = dialogRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), button');
    firstInput?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onTab);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keydown', onTab); previousFocus?.focus(); };
  }, [onClose]);

  return (
    <div className="credential-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="credential-dialog-title" className="credential-dialog flex max-h-[min(720px,92vh)] w-full max-w-[880px] flex-col overflow-hidden rounded-xl">
        <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div><h2 id="credential-dialog-title" className="font-semibold text-white">Créer un credential</h2><p className="mt-0.5 text-xs text-slate-400">Les valeurs secrètes sont chiffrées avant leur enregistrement.</p></div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Fermer"><X size={18} /></button>
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-slate-700 p-4 md:border-b-0 md:border-r" aria-label="Types de credentials">
            <label className="relative mb-3"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un type…" className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" /></label>
            <div className="min-h-0 space-y-1 overflow-y-auto">
              {filteredTypes.map((type) => {
                const Icon = type.icon;
                return <button key={type.type} type="button" onClick={() => { setSelectedType(type.type); setData({}); setTestResult(null); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selectedType === type.type ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800"><Icon size={17} /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{type.name}</span><span className="block truncate text-xs text-slate-500">{type.description}</span></span></button>;
              })}
            </div>
          </aside>
          <form className="flex min-h-0 flex-col" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-blue-400"><definition.icon size={20} /></span><div><h3 className="font-semibold text-white">{definition.name}</h3><p className="text-xs text-slate-400">{definition.description}</p></div></div>
              <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-300">Nom</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Compte de production" className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" /></label>
              {definition.fields.map((field) => <label key={field.name} className="block space-y-1.5"><span className="text-sm font-medium text-slate-300">{field.label}</span><input required type={field.type ?? 'text'} value={data[field.name] ?? ''} onChange={(event) => { setData((current) => ({ ...current, [field.name]: event.target.value })); setTestResult(null); }} placeholder={field.placeholder} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" /></label>)}
              {testResult && <p role="status" className={`rounded-md border px-3 py-2 text-sm ${testResult.success ? 'border-emerald-500/40 text-emerald-400' : 'border-red-500/40 text-red-400'}`}>{testResult.message}</p>}
              {saveMutation.error && <p role="alert" className="text-sm text-red-400">{saveMutation.error instanceof Error ? saveMutation.error.message : 'Impossible d’enregistrer ce credential.'}</p>}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 px-5 py-4">
              <button type="button" onClick={() => { setTestResult(null); testMutation.mutate(); }} disabled={testMutation.isPending} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-600 px-3 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"><ShieldCheck size={16} />{testMutation.isPending ? 'Test en cours…' : 'Tester la connexion'}</button>
              <div className="flex gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md px-3 text-sm text-slate-400 hover:bg-slate-700">Annuler</button><button type="submit" disabled={!name.trim() || saveMutation.isPending} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}</button></div>
            </footer>
          </form>
        </div>
      </section>
    </div>
  );
}

function typeLabel(type: string): string {
  return CREDENTIAL_TYPES.find((item) => item.type === type)?.name ?? type;
}

export function CredentialsPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const { data: credentialsList, isLoading, error, refetch } = useQuery({ queryKey: ['credentials'], queryFn: credentials.list });
  const deleteMutation = useMutation({ mutationFn: credentials.delete, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['credentials'] }) });
  const deleteCredential = (credential: Credential) => { if (confirm(`Supprimer « ${credential.name} » ?`)) deleteMutation.mutate(credential.id); };

  if (isLoading) return <div className="space-y-3" aria-label="Chargement des credentials">{[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-800" />)}</div>;
  if (error) return <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center"><p className="text-red-400">Impossible de charger les credentials.</p><button type="button" onClick={() => void refetch()} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Réessayer</button></div>;

  return (
    <section>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-white">Credentials</h1><p className="mt-1 text-sm text-slate-400">Clés API et comptes utilisés par vos workflows</p></div><button type="button" onClick={() => setIsCreating(true)} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={17} />Créer un credential</button></header>
      {!credentialsList?.length ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 px-6 text-center"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 text-slate-400"><KeyRound size={28} /></span><h2 className="font-semibold text-white">Aucun credential enregistré</h2><p className="mt-1 max-w-sm text-sm text-slate-400">Stockez vos clés API de manière chiffrée pour les utiliser dans les workflows.</p><button type="button" onClick={() => setIsCreating(true)} className="mt-5 flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={17} />Créer un credential</button></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800"><table className="w-full min-w-[680px] border-collapse text-left"><thead className="border-b border-slate-700 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Nom</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Valeur masquée</th><th className="px-5 py-3">Créé</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{credentialsList.map((credential) => <tr key={credential.id} className="border-b border-slate-700/70 last:border-0 hover:bg-slate-700/30"><td className="px-5 py-4 text-sm font-medium text-white">{credential.name}</td><td className="px-5 py-4 text-sm text-slate-300">{typeLabel(credential.type)}</td><td className="px-5 py-4 font-mono text-xs text-slate-400">{credential.hint}</td><td className="px-5 py-4 text-xs text-slate-400">{new Date(credential.created_at).toLocaleDateString('fr-FR')}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => deleteCredential(credential)} className="rounded-md p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Supprimer ${credential.name}`} title="Supprimer"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>
      )}
      {isCreating && <CredentialDialog onClose={() => setIsCreating(false)} />}
    </section>
  );
}
