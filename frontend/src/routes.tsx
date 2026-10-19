import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EditorPage } from './features/editor/EditorPage';
import { CredentialsPage } from './features/credentials/CredentialsPage';
import { ExecutionsPage } from './features/executions/ExecutionsPage';
import { AppLayout } from './features/layout/AppLayout';
import { RequireAuth } from './features/auth/RequireAuth';

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'workflows/:id',
        element: <EditorPage />,
      },
      {
        path: 'workflows/:id/executions',
        element: <ExecutionsPage />,
      },
      {
        path: 'credentials',
        element: <CredentialsPage />,
      },
      {
        path: '*',
        element: <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">404 - Page non trouvée</h1>
          <Navigate to="/" replace />
        </div>,
      },
    ],
  },
]);
