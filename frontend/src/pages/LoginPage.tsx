import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { AuthForm } from '../components/AuthForm';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Iniciar sesión"
      submitLabel="Entrar"
      onSubmit={async (email, password) => {
        await login(email, password);
        navigate('/tasks', { replace: true });
      }}
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-indigo-700 hover:underline">
            Regístrate
          </Link>
        </>
      }
    />
  );
}
