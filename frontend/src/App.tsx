import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { LoginPage } from './pages/LoginPage';
import { Placeholder } from './pages/Placeholder';
import { RegisterPage } from './pages/RegisterPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/week" replace /> },
          { path: '/week', element: <Placeholder title="Semana" /> },
          { path: '/tasks', element: <Placeholder title="Tareas" /> },
          { path: '/availability', element: <AvailabilityPage /> },
          { path: '/stats', element: <Placeholder title="Productividad" /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
