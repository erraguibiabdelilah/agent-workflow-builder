import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, Workflow as WorkflowIcon } from 'lucide-react';
import { auth } from '../../lib/api';

type Theme = 'dark' | 'light';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditor = /^\/workflows\/[^/]+$/.test(location.pathname);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('agentflow-sidebar-collapsed') === 'true');
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [email, setEmail] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('agentflow-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('agentflow-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    let active = true;
    void auth.getSession().then((session) => {
      if (active && session?.user.email) setEmail(session.user.email);
    });
    return () => { active = false; };
  }, []);

  const handleLogout = async () => {
    try { await auth.logout(); } catch { /* The local token is still cleared by the client. */ }
    navigate('/login', { replace: true });
  };

  if (isEditor) {
    return <main className="editor-route"><Outlet /></main>;
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${isActive ? 'bg-slate-700 text-white before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:bg-blue-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`;

  return (
    <div className="app-layout">
      <aside className="app-sidebar" data-collapsed={collapsed} aria-label="Navigation principale">
        <div className={`mb-8 flex h-9 items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          <NavLink to="/" className="flex min-w-0 items-center gap-2.5" aria-label="AgentFlow, workflows">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white"><WorkflowIcon size={17} /></span>
            {!collapsed && <span className="truncate text-base font-semibold tracking-tight text-white">AgentFlow</span>}
          </NavLink>
          {!collapsed && (
            <button type="button" onClick={() => setCollapsed(true)} className="rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white" aria-label="Réduire la barre latérale" title="Réduire la barre latérale">
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <button type="button" onClick={() => setCollapsed(false)} className="mb-4 flex h-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-700 hover:text-white" aria-label="Développer la barre latérale" title="Développer la barre latérale">
            <PanelLeftOpen size={17} />
          </button>
        )}

        <nav className="flex flex-col gap-1" aria-label="Sections">
          <NavLink to="/" end className={navClass} title={collapsed ? 'Workflows' : undefined}>
            <WorkflowIcon size={17} className="shrink-0" />{!collapsed && <span>Workflows</span>}
          </NavLink>
          <NavLink to="/credentials" className={navClass} title={collapsed ? 'Credentials' : undefined}>
            <KeyRound size={17} className="shrink-0" />{!collapsed && <span>Credentials</span>}
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-slate-700 pt-3">
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex h-9 items-center gap-3 rounded-md px-3 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white" aria-label={`Activer le thème ${theme === 'dark' ? 'clair' : 'sombre'}`} title={collapsed ? `Thème ${theme === 'dark' ? 'clair' : 'sombre'}` : undefined}>
            {theme === 'dark' ? <Sun size={17} className="shrink-0" /> : <Moon size={17} className="shrink-0" />}
            {!collapsed && <span>Thème {theme === 'dark' ? 'clair' : 'sombre'}</span>}
          </button>
          <div className={`flex min-w-0 items-center gap-3 rounded-md px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">{email ? email.slice(0, 1).toUpperCase() : 'A'}</span>
            {!collapsed && <span className="min-w-0 flex-1 truncate text-xs text-slate-400" title={email}>{email || 'Mon compte'}</span>}
            <button type="button" onClick={() => void handleLogout()} className="rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white" aria-label="Déconnexion" title="Déconnexion">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="app-main"><div className="app-content"><Outlet /></div></main>
    </div>
  );
}
