import { useParams } from 'react-router-dom';

export function ExecutionsPage() {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Historique des exécutions</h1>
      <div className="text-slate-400">
        <p className="mb-4">Historique des exécutions pour le workflow {id}</p>
        <p className="text-sm">(en construction)</p>
      </div>
    </div>
  );
}
