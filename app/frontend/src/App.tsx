import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import MinistrosPage from './pages/ministers/MinistrosPage';
import TareasPage from './pages/tasks/TareasPage';
import ReservasPage from './pages/reservas/ReservasPage';
import GruposPage from './pages/grupos/gruposPage';
import EspaciosPage from './pages/espacios/EspaciosPage';
import EspacioDetallePage from './pages/espacios/EspacioDetallePage';
import Navbar from './components/layout/Navbar';

function AppContent() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login';

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ministros" element={<MinistrosPage />} />
        <Route path="/tareas" element={<TareasPage />} />
        <Route path="/reservas" element={<ReservasPage />} />
        <Route path="/grupos" element={<GruposPage />} />
        <Route path="/espacios" element={<EspaciosPage />} />
        <Route path="/espacios/:id" element={<EspacioDetallePage />} />
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
