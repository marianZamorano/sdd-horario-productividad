import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { LoginPage } from './pages/LoginPage';
import { Placeholder } from './pages/Placeholder';
import { RegisterPage } from './pages/RegisterPage';
import { TasksPage } from './pages/TasksPage';
import { WeekPage } from './pages/WeekPage';

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
          { path: '/week', element: <WeekPage /> },
          { path: '/tasks', element: <TasksPage /> },
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
