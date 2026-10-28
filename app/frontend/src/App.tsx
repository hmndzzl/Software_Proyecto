import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { esES } from '@clerk/localizations';
import { AuthProvider } from './context/AuthContext';
import { ErrorProvider } from './context/ErrorContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import GlobalErrorBanner from './components/ui/GlobalErrorBanner';
import AppShell from './components/layout/AppShell';
import ProtectedRoute, { ROLES } from './components/ui/ProtectedRoute';
import { ROLES_RESERVAS } from './utils/roles';
import LoadingState from './components/ui/LoadingState';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const AgendaPublicaPage = lazy(() => import('./pages/agenda-publica/AgendaPublicaPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const MinistrosPage = lazy(() => import('./pages/ministers/MinistrosPage'));
const CoordinadoresMinistrosPage = lazy(() => import('./pages/coordinadores/CoordinadoresMinistrosPage'));
const TareasPage = lazy(() => import('./pages/tasks/TareasPage'));
const ReservasPage = lazy(() => import('./pages/reservas/ReservasPage'));
const GruposPage = lazy(() => import('./pages/grupos/gruposPage'));
const EspaciosPage = lazy(() => import('./pages/espacios/EspaciosPage'));
const EspacioDetallePage = lazy(() => import('./pages/espacios/EspacioDetallePage'));
const EventosPage = lazy(() => import('./pages/eventos/EventosPage'));
const MisReservasPage = lazy(() => import('./pages/mis-reservas/MisReservasPage'));
const NotificacionesPage = lazy(() => import('./pages/notificaciones/NotificacionesPage'));
const PerfilPage = lazy(() => import('./pages/perfil/PerfilPage'));
const CalendarioPage = lazy(() => import('./pages/calendario/CalendarioPage'));
const CambiosTurnoPage = lazy(() => import('./pages/cambios-turno/CambiosTurnoPage'));
const NotFoundPage = lazy(() => import('./pages/not_found_page/NotFoundPage'));
const AusenciasPage = lazy(() => import('./pages/ausencias/AusenciasPage'));
const CuentasPage = lazy(() => import('./pages/cuentas/CuentasPage'));
import ClerkSessionSync from './auth/ClerkSessionSync';
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from './auth/clerkSession';
import { leerTemaAplicacion, UI_PREFERENCES_EVENT } from './auth/sessionStore';
const ConfiguracionPage = lazy(() => import('./pages/configuracion/ConfiguracionPage'));
const ContenidoPublicoPage = lazy(() => import('./pages/contenido-publico/ContenidoPublicoPage'));
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage'));
const MensajesContactoPage = lazy(() => import('./pages/mensajes-contacto/MensajesContactoPage'));

const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.SACERDOTE,
  ROLES.COORDINADOR_MINISTROS,
  ROLES.COORDINADOR_GRUPOS,
  ROLES.MINISTRO,
];

function SincronizarPreferenciasUI() {
  useEffect(() => {
    const sincronizar = () => {
      document.documentElement.dataset.tema = leerTemaAplicacion();
    };
    sincronizar();
    window.addEventListener(UI_PREFERENCES_EVENT, sincronizar);
    return () => window.removeEventListener(UI_PREFERENCES_EVENT, sincronizar);
  }, []);

  return null;
}

function AppContent() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AppRoutes />
    </Suspense>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const isLanding = location.pathname === '/';
  const isAgendaPublica = location.pathname === '/agenda';

  if (isLanding) {
    return <LandingPage />;
  }

  if (isAgendaPublica) {
    return <AgendaPublicaPage />;
  }

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

        <Route path="/ministros/coordinadores" element={
          <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.ADMIN]}>
            <CoordinadoresMinistrosPage />
          </ProtectedRoute>
        } />

        <Route
          path="/reportes"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.ADMIN]}>
              <ReportesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reservas"
          element={
            <ProtectedRoute allowedRoles={ROLES_RESERVAS}>
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
            <ProtectedRoute allowedRoles={ROLES_RESERVAS}>
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
          path="/calendario"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <CalendarioPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cambios-turno"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MINISTRO, ROLES.ADMIN]}>
              <CambiosTurnoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mis-reservas"
          element={
            <ProtectedRoute allowedRoles={ROLES_RESERVAS}>
              <MisReservasPage />
            </ProtectedRoute>
          }
        />

        <Route path="/ausencias" element={
          <ProtectedRoute allowedRoles={[ROLES.MINISTRO, ROLES.ADMIN]}>
            <AusenciasPage />
          </ProtectedRoute>
        } />

        <Route
          path="/notificaciones"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <NotificacionesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cuentas"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.ADMIN]}>
              <CuentasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <PerfilPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracion"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <ConfiguracionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contenido-publico"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.ADMIN]}>
              <ContenidoPublicoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mensajes-contacto"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SACERDOTE, ROLES.ADMIN]}>
              <MensajesContactoPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

// Clerk solo se monta si hay publishable key; sin ella la app usa el login anterior.
// Las redirecciones de Clerk usan el router de la app: sin esto recargan la página completa,
// y con eso se pierde el estado (mensajes de error incluidos) y la pantalla parpadea.
function MaybeClerkProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  if (!CLERK_ENABLED) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      localization={esES}
      afterSignOutUrl="/login"
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

function App() {
  return (
    <ErrorProvider>
      <ErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SincronizarPreferenciasUI />
          <MaybeClerkProvider>
            <ToastProvider>
              <AuthProvider>
                {CLERK_ENABLED && <ClerkSessionSync />}
                <AppContent />
                <GlobalErrorBanner />
              </AuthProvider>
            </ToastProvider>
          </MaybeClerkProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ErrorProvider>
  );
}

export default App;
