import { Navigate, Outlet } from 'react-router';
import { useAuth } from './useAuth';

/** Solo deja pasar con sesión iniciada; si no, redirige a /login. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
