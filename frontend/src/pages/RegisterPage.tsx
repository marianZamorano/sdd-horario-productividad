import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { AuthForm } from '../components/AuthForm';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Crear cuenta"
      submitLabel="Crear cuenta"
      onSubmit={async (email, password) => {
        await register(email, password);
        navigate('/tasks', { replace: true });
      }}
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-indigo-700 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    />
  );
}
