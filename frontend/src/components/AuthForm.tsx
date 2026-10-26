import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../api/client';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthFormProps {
  title: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  footer: ReactNode;
}

/** Formulario común de login y registro con validación en español. */
export function AuthForm({ title, submitLabel, onSubmit, footer }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      email: EMAIL_PATTERN.test(email.trim()) ? undefined : 'Introduce un email válido',
      password:
        password.length >= 8 ? undefined : 'La contraseña debe tener al menos 8 caracteres',
    };
    setErrors(nextErrors);
    setApiError(null);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>

        {apiError && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitLabel}
        </button>

        <p className="text-center text-sm text-slate-600">{footer}</p>
      </form>
    </div>
  );
}
