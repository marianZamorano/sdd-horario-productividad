import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { Placeholder } from './pages/Placeholder';

const router = createBrowserRouter([
  { path: '/login', element: <Placeholder title="Iniciar sesión" /> },
  { path: '/register', element: <Placeholder title="Crear cuenta" /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/week" replace /> },
      { path: '/week', element: <Placeholder title="Semana" /> },
      { path: '/tasks', element: <Placeholder title="Tareas" /> },
      { path: '/availability', element: <Placeholder title="Disponibilidad" /> },
      { path: '/stats', element: <Placeholder title="Productividad" /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
