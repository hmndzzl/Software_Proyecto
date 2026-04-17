import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import MinistrosPage from './pages/ministers/MinistrosPage';
import TareasPage from './pages/tasks/TareasPage';
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
        <Route path="/" element={<Navigate to="/tareas" replace />} />
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
