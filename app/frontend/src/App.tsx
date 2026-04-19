import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import MinistrosPage from './pages/ministers/MinistrosPage';
import TareasPage from './pages/tasks/TareasPage';
import ReservasPage from './pages/reservas/ReservasPage';
import GruposPage from './pages/grupos/gruposPage';
import EspaciosPage from './pages/espacios/EspaciosPage';
import EspacioDetallePage from './pages/espacios/EspacioDetallePage';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/ui/ProtectedRoute';

import { ROLES } from './components/ui/ProtectedRoute';

function AppContent() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login';

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />

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
            <ProtectedRoute allowedRoles={[
              ROLES.SACERDOTE,
              ROLES.COORDINADOR_MINISTROS,
              ROLES.COORDINADOR_GRUPOS
            ]}>
              <ReservasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/grupos"
          element={
            <ProtectedRoute allowedRoles={[
              ROLES.SACERDOTE,
              ROLES.COORDINADOR_GRUPOS
            ]}>
              <GruposPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/espacios"
          element={
            <ProtectedRoute allowedRoles={[
              ROLES.SACERDOTE,
              ROLES.COORDINADOR_MINISTROS,
              ROLES.COORDINADOR_GRUPOS
            ]}>
              <EspaciosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/espacios/:id"
          element={
            <ProtectedRoute allowedRoles={[
              ROLES.SACERDOTE,
              ROLES.COORDINADOR_MINISTROS,
              ROLES.COORDINADOR_GRUPOS
            ]}>
              <EspacioDetallePage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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
