import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import MinistrosPage from './pages/ministers/MinistrosPage';
import TareasPage from './pages/tasks/TareasPage';
import ReservasPage from './pages/reservas/ReservasPage';
import GruposPage from './pages/grupos/gruposPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import EspaciosPage from './pages/espacios/EspaciosPage';
import EspacioDetallePage from './pages/espacios/EspacioDetallePage';
import EventosPage from './pages/eventos/EventosPage';
import Navbar from './components/layout/Navbar';
import ProtectedRoute, { ROLES } from './components/ui/ProtectedRoute';
import NotFoundPage from './pages/not_found_page/NotFoundPage';

function AppContent() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login' && location.pathname !== '*';

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMIN,
                ROLES.SACERDOTE,
                ROLES.COORDINADOR_MINISTROS,
                ROLES.COORDINADOR_GRUPOS,
                ROLES.MINISTRO,
              ]}
            >
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ministros"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS]}>
              <MinistrosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tareas"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO]}>
              <TareasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reservas"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.SACERDOTE,
                ROLES.COORDINADOR_MINISTROS,
                ROLES.COORDINADOR_GRUPOS,
              ]}
            >
              <ReservasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/grupos"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS]}>
              <GruposPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/espacios"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.SACERDOTE,
                ROLES.COORDINADOR_MINISTROS,
                ROLES.COORDINADOR_GRUPOS,
              ]}
            >
              <EspaciosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/espacios/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.SACERDOTE,
                ROLES.COORDINADOR_MINISTROS,
                ROLES.COORDINADOR_GRUPOS,
              ]}
            >
              <EspacioDetallePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMIN,
                ROLES.SACERDOTE,
                ROLES.COORDINADOR_MINISTROS,
                ROLES.COORDINADOR_GRUPOS,
                ROLES.MINISTRO,
              ]}
            >
              <EventosPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;