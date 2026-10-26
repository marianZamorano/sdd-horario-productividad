import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/useAuth';

const links = [
  { to: '/week', label: 'Semana' },
  { to: '/tasks', label: 'Tareas' },
  { to: '/availability', label: 'Disponibilidad' },
  { to: '/stats', label: 'Productividad' },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-semibold text-indigo-700">Horario Productivo</span>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded px-2 py-1 text-sm ${isActive ? 'bg-indigo-100 text-indigo-800' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
