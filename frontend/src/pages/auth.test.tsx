import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

const authResponse = {
  accessToken: 'token-123',
  user: { id: 'u1', email: 'ana@example.com', timezone: 'America/La_Paz', createdAt: '' },
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderAt(path: '/login' | '/register') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/tasks', element: <p>Página de tareas</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

describe('Páginas de autenticación (US1)', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('el registro valida email y contraseña en español sin llamar a la API', async () => {
    renderAt('/register');
    await userEvent.type(screen.getByLabelText('Email'), 'no-es-email');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'corta');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByText('Introduce un email válido')).toBeInTheDocument();
    expect(
      screen.getByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('el registro envía email, contraseña y zona horaria, guarda el token y va a /tasks', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, authResponse));
    renderAt('/register');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Página de tareas')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/register$/);
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'ana@example.com',
      password: 'secreto123',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(localStorage.getItem('horario.token')).toBe('token-123');
  });

  it('el registro muestra el error de la API (email ya registrado)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        statusCode: 409,
        message: 'Ya existe una cuenta con ese email',
        code: 'EMAIL_TAKEN',
      }),
    );
    renderAt('/register');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe una cuenta con ese email',
    );
  });

  it('el login muestra "Credenciales inválidas" ante un 401', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { statusCode: 401, message: 'Credenciales inválidas' }),
    );
    renderAt('/login');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(localStorage.getItem('horario.token')).toBeNull();
  });

  it('el login correcto redirige a /tasks', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, authResponse));
    renderAt('/login');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Página de tareas')).toBeInTheDocument();
  });
});
