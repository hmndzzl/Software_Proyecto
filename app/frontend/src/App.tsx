import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute, { ROLES } from './components/ui/ProtectedRoute';

import LoginPage         from './pages/auth/LoginPage';
import DashboardPage     from './pages/dashboard/DashboardPage';
import MinistrosPage     from './pages/ministers/MinistrosPage';
import TareasPage        from './pages/tasks/TareasPage';
import ReservasPage      from './pages/reservas/ReservasPage';
import GruposPage        from './pages/grupos/gruposPage';
import EspaciosPage      from './pages/espacios/EspaciosPage';
import EspacioDetallePage from './pages/espacios/EspacioDetallePage';
import EventosPage       from './pages/eventos/EventosPage';
import MisReservasPage   from './pages/mis-reservas/MisReservasPage';
import NotFoundPage      from './pages/not_found_page/NotFoundPage';

const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.SACERDOTE,
  ROLES.COORDINADOR_MINISTROS,
  ROLES.COORDINADOR_GRUPOS,
  ROLES.MINISTRO,
];

function AppContent() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ministros"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.ADMIN]}>
              <MinistrosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tareas"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO, ROLES.ADMIN]}>
              <TareasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reservas"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN]}>
              <ReservasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/grupos"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN]}>
              <GruposPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/espacios"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN]}>
              <EspaciosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/espacios/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN]}>
              <EspacioDetallePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <EventosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mis-reservas"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <MisReservasPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
