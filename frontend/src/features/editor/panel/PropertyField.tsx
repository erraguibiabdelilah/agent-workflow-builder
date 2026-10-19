import { useEffect, useState } from 'react';
import type { Credential } from '../../../lib/api';
import type { NodeProperty } from '../../../../shared/src/node-types';
import { CredentialSelector } from './CredentialSelector';
import { ExpressionHelp } from './ExpressionHelp';

interface PropertyFieldProps {
  property: NodeProperty;
  value: unknown;
  values: Record<string, unknown>;
  nodeNames: string[];
  credentialsList: Credential[];
  onChange: (value: unknown) => void;
  onCredentialChange: (credentialType: string, credentialId: string) => void;
  onRefreshCredentials: () => void;
  path?: string;
}

export function PropertyField({
  property,
  value,
  values,
  nodeNames,
  credentialsList,
  onChange,
  onCredentialChange,
  onRefreshCredentials,
  path,
}: PropertyFieldProps) {
  const [touched, setTouched] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() => formatJson(value));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const inputId = path ?? property.name;
  const error = jsonError ?? getFieldError(property, value, touched);

  useEffect(() => {
    if (property.type === 'json') {
      setJsonDraft(formatJson(value));
      setJsonError(null);
    }
  }, [property.type, value]);

  if (property.showWhen && values[property.showWhen.property] !== property.showWhen.equals) return null;

  const label = (
    <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-200">
      {property.displayName}{property.required ? <span className="ml-1 text-red-400" aria-label="obligatoire">*</span> : null}
    </label>
  );
  const description = property.description && <p className="mb-1.5 text-xs text-slate-500">{property.description}</p>;
  const controlClass = `w-full rounded-md border bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 ${error ? 'border-red-500/80' : 'border-slate-700'}`;
  const updateTouched = () => setTouched(true);

  let control;
  switch (property.type) {
    case 'string':
      control = <input id={inputId} type="text" value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} onBlur={updateTouched} placeholder={property.placeholder} required={property.required} className={controlClass} aria-invalid={!!error} />;
      break;
    case 'text':
      control = <textarea id={inputId} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} onBlur={updateTouched} placeholder={property.placeholder} required={property.required} rows={4} className={`${controlClass} resize-y`} aria-invalid={!!error} />;
      break;
    case 'number':
      control = <input id={inputId} type="number" value={typeof value === 'number' ? value : ''} onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))} onBlur={updateTouched} placeholder={property.placeholder} required={property.required} min={property.min} max={property.max} step="any" className={controlClass} aria-invalid={!!error} />;
      break;
    case 'boolean':
      control = <label htmlFor={inputId} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
        <input id={inputId} type="checkbox" checked={typeof value === 'boolean' ? value : Boolean(property.default ?? false)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-sky-500" />
        <span>{property.displayName}</span>
        {property.required && <span className="text-red-400">*</span>}
      </label>;
      break;
    case 'options':
      control = <select id={inputId} value={value === undefined || value === null ? '' : String(value)} onChange={(event) => { onChange(event.target.value); updateTouched(); }} onBlur={updateTouched} required={property.required} className={controlClass} aria-invalid={!!error}>
        <option value="">Sélectionner…</option>
        {(property.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>;
      break;
    case 'json':
      control = <textarea id={inputId} value={jsonDraft} onChange={(event) => {
        const draft = event.target.value;
        setJsonDraft(draft);
        setTouched(true);
        try {
          onChange(JSON.parse(draft));
          setJsonError(null);
        } catch {
          setJsonError('JSON invalide. Corrigez la syntaxe pour enregistrer cette valeur.');
        }
      }} onBlur={updateTouched} placeholder={property.placeholder ?? '{\n  "key": "value"\n}'} required={property.required} rows={6} className={`${controlClass} resize-y font-mono text-xs`} aria-invalid={!!error} />;
      break;
    case 'credential': {
      const credentialType = property.credentialType ?? property.name;
      control = <CredentialSelector
        credentialType={credentialType}
        value={typeof value === 'string' ? value : ''}
        credentialsList={credentialsList}
        onChange={(credentialId) => { onCredentialChange(credentialType, credentialId); updateTouched(); }}
        onRefresh={onRefreshCredentials}
      />;
      break;
    }
    case 'list': {
      const entries = Array.isArray(value) ? value : [];
      const itemFields = property.itemFields ?? [];
      control = <div className="space-y-2">
        {entries.map((entry, index) => {
          const item = isRecord(entry) ? entry : {};
          return <div key={`${inputId}-${index}`} className="rounded-md border border-slate-700 bg-slate-900/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Élément {index + 1}</span>
              <button type="button" onClick={() => { setTouched(true); onChange(entries.filter((_, itemIndex) => itemIndex !== index)); }} className="text-xs text-red-400 hover:text-red-300">Supprimer</button>
            </div>
            <div className="space-y-3">
              {itemFields.map((field) => <PropertyField
                key={`${inputId}-${index}-${field.name}`}
                property={field}
                value={item[field.name]}
                values={item}
                nodeNames={nodeNames}
                credentialsList={credentialsList}
                path={`${inputId}-${index}-${field.name}`}
                onChange={(fieldValue) => onChange(entries.map((current, itemIndex) => itemIndex === index ? { ...item, [field.name]: fieldValue } : current))}
                onCredentialChange={onCredentialChange}
                onRefreshCredentials={onRefreshCredentials}
              />)}
            </div>
          </div>;
        })}
        <button type="button" onClick={() => { setTouched(true); onChange([...entries, createListItem(itemFields)]); }} className="w-full rounded-md border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-sky-500 hover:text-white">
          + Ajouter {property.displayName.toLowerCase().replace(/s$/, '')}
        </button>
      </div>;
      break;
    }
  }

  return (
    <div className="space-y-1">
      {property.type === 'boolean' ? null : label}
      {description}
      {control}
      {property.type === 'number' && (property.min !== undefined || property.max !== undefined) && (
        <p className="text-[11px] text-slate-500">{property.min !== undefined && `Min. ${property.min}`}{property.min !== undefined && property.max !== undefined && ' · '}{property.max !== undefined && `Max. ${property.max}`}</p>
      )}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      {property.supportsExpressions && <ExpressionHelp nodeNames={nodeNames} />}
    </div>
  );
}

function getFieldError(property: NodeProperty, value: unknown, touched: boolean): string | null {
  if (!touched) return null;
  if (property.required && property.type === 'list' && Array.isArray(value) && value.length === 0) return 'Ajoutez au moins un élément.';
  if (property.required && (value === undefined || value === null || value === '')) return `${property.displayName} est obligatoire.`;
  if (property.type === 'number' && typeof value === 'number') {
    if (property.min !== undefined && value < property.min) return `La valeur minimale est ${property.min}.`;
    if (property.max !== undefined && value > property.max) return `La valeur maximale est ${property.max}.`;
  }
  return null;
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2) ?? '';
}

function createListItem(fields: NodeProperty[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.name, initialValue(field)]));
}

function initialValue(property: NodeProperty): unknown {
  if (property.default !== undefined) return structuredClone(property.default);
  if (property.type === 'boolean') return false;
  if (property.type === 'list') return [];
  if (property.type === 'json') return {};
  if (property.type === 'number') return undefined;
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
