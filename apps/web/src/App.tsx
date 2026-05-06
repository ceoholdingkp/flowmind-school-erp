import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { usePortalAuthStore } from './store/portalAuth.store';

import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matricula from './pages/Matricula';
import Asistencia from './pages/Asistencia';
import AsistenciaResumen from './pages/asistencia/AsistenciaResumen';
import Atrasos from './pages/Atrasos';
import Calificaciones from './pages/Calificaciones';
import Convivencia from './pages/Convivencia';
import Leccionario from './pages/Leccionario';
import Placeholder from './pages/Placeholder';

// Finanzas
import EER from './pages/finanzas/EER';
import SaludFinanciera from './pages/finanzas/SaludFinanciera';
import Presupuesto from './pages/finanzas/Presupuesto';
import Conciliacion from './pages/finanzas/Conciliacion';
import Rendicion from './pages/finanzas/Rendicion';
import Proveedores from './pages/finanzas/Proveedores';
import Pagos from './pages/finanzas/Pagos';

// Matrículas (Paso 8)
import ListaAlumnos from './pages/matricula/ListaAlumnos';
import FichaAlumno from './pages/matricula/FichaAlumno';
import NuevaMatricula from './pages/matricula/NuevaMatricula';
import ResumenMatriculas from './pages/matricula/ResumenMatriculas';

// Académico V2
import LibroNotas from './pages/academico/LibroNotas';
import InformeNotas from './pages/academico/InformeNotas';

// Remuneraciones V2
import LiquidacionesMes from './pages/remuneraciones/LiquidacionesMes';
import DetalleLiquidacion from './pages/remuneraciones/DetalleLiquidacion';
import ResumenAnual from './pages/remuneraciones/ResumenAnual';
import ExportarPrevired from './pages/remuneraciones/ExportarPrevired';

// Finanzas — Rendición SuperEduc
import PlanCuentasSupereduc from './pages/finanzas/PlanCuentasSupereduc';
import NuevoMovimientoSupereduc from './pages/finanzas/NuevoMovimientoSupereduc';
import MovimientosSupereduc from './pages/finanzas/MovimientosSupereduc';
import ResumenSupereduc from './pages/finanzas/ResumenSupereduc';

// EDE / Libro Digital
import PanelEDE from './pages/ede/PanelEDE';
import FirmaDigital from './pages/ede/FirmaDigital';

// Comunicaciones
import ListaComunicados from './pages/comunicaciones/ListaComunicados';
import NuevoComunicado from './pages/comunicaciones/NuevoComunicado';
import DetalleComunicado from './pages/comunicaciones/DetalleComunicado';
import Mensajes from './pages/comunicaciones/Mensajes';

// RRHH
import Funcionarios from './pages/rrhh/Funcionarios';
import AsistenciaRRHH from './pages/rrhh/AsistenciaRRHH';
import Remuneraciones from './pages/rrhh/Remuneraciones';
import Contratos from './pages/rrhh/Contratos';

// Complementarios
import Inventario from './pages/Inventario';
import Calendario from './pages/Calendario';
import PME from './pages/PME';
import Cumplimiento from './pages/Cumplimiento';

// Portal Apoderado (legacy)
import LoginApoderado from './pages/apoderado/LoginApoderado';
import PortalApoderado from './pages/apoderado/PortalApoderado';

// Portal V2 — auth directo por RUT
import LoginPortal from './pages/portal/LoginPortal';
import HomePortal from './pages/portal/HomePortal';
import NotasHijo from './pages/portal/NotasHijo';
import AsistenciaHijo from './pages/portal/AsistenciaHijo';
import ComunicadosPortal from './pages/portal/ComunicadosPortal';

// Admin
import WizardOnboarding from './pages/admin/WizardOnboarding';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  // Apoderados no tienen acceso al ERP principal
  if (user?.rol === 'APODERADO') return <Navigate to="/apoderado" replace />;
  return <>{children}</>;
}

function ApoderadoRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/apoderado/login" replace />;
  return <>{children}</>;
}

function PortalRoute({ children }: { children: React.ReactNode }) {
  const { init } = usePortalAuthStore();
  const [checked, setChecked] = React.useState(false);
  React.useEffect(() => { init(); setChecked(true); }, []);
  if (!checked) return null;
  const token = localStorage.getItem('portal_token');
  if (!token) return <Navigate to="/portal/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* ── Auth ── */}
        <Route path="/login" element={<Login />} />

        {/* ── Portal Apoderado (legacy) ── */}
        <Route path="/apoderado/login" element={<LoginApoderado />} />
        <Route path="/apoderado" element={
          <ApoderadoRoute>
            <PortalApoderado />
          </ApoderadoRoute>
        } />

        {/* ── Portal V2 (auth directo por RUT) ── */}
        <Route path="/portal/login" element={<LoginPortal />} />
        <Route path="/portal" element={<PortalRoute><HomePortal /></PortalRoute>} />
        <Route path="/portal/hijo/:id/notas" element={<PortalRoute><NotasHijo /></PortalRoute>} />
        <Route path="/portal/hijo/:id/asistencia" element={<PortalRoute><AsistenciaHijo /></PortalRoute>} />
        <Route path="/portal/comunicados" element={<PortalRoute><ComunicadosPortal /></PortalRoute>} />

        {/* ── ERP Principal (staff) ── */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Alumnos */}
          <Route path="matricula" element={<Matricula />} />
          <Route path="matricula/alumnos" element={<ListaAlumnos />} />
          <Route path="matricula/alumnos/:id" element={<FichaAlumno />} />
          <Route path="matricula/nuevo" element={<NuevaMatricula />} />
          <Route path="matricula/resumen" element={<ResumenMatriculas />} />
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="asistencia/registro" element={<Asistencia />} />
          <Route path="asistencia/resumen" element={<AsistenciaResumen />} />
          <Route path="atrasos" element={<Atrasos />} />

          {/* Académico */}
          <Route path="calificaciones" element={<Calificaciones />} />
          <Route path="academico/notas" element={<LibroNotas />} />
          <Route path="academico/informe" element={<InformeNotas />} />
          <Route path="convivencia" element={<Convivencia />} />
          <Route path="leccionario" element={<Leccionario />} />

          {/* Finanzas */}
          <Route path="finanzas/eer" element={<EER />} />
          <Route path="finanzas/salud" element={<SaludFinanciera />} />
          <Route path="finanzas/presupuesto" element={<Presupuesto />} />
          <Route path="finanzas/conciliacion" element={<Conciliacion />} />
          <Route path="finanzas/rendicion" element={<Rendicion />} />
          <Route path="finanzas/rendicion/cuentas" element={<PlanCuentasSupereduc />} />
          <Route path="finanzas/rendicion/movimientos/nuevo" element={<NuevoMovimientoSupereduc />} />
          <Route path="finanzas/rendicion/movimientos" element={<MovimientosSupereduc />} />
          <Route path="finanzas/rendicion/resumen" element={<ResumenSupereduc />} />
          <Route path="finanzas/proveedores" element={<Proveedores />} />
          <Route path="finanzas/pagos" element={<Pagos />} />

          {/* EDE / Libro Digital */}
          <Route path="ede" element={<PanelEDE />} />
          <Route path="ede/firma" element={<FirmaDigital />} />

          {/* Comunicaciones */}
          <Route path="comunicaciones" element={<ListaComunicados />} />
          <Route path="comunicaciones/nuevo" element={<NuevoComunicado />} />
          <Route path="comunicaciones/mensajes" element={<Mensajes />} />
          <Route path="comunicaciones/:id" element={<DetalleComunicado />} />

          {/* RRHH */}
          <Route path="rrhh/funcionarios" element={<Funcionarios />} />
          <Route path="rrhh/asistencia" element={<AsistenciaRRHH />} />
          <Route path="rrhh/remuneraciones" element={<Remuneraciones />} />
          <Route path="rrhh/contratos" element={<Contratos />} />
          {/* Remuneraciones V2 */}
          <Route path="remuneraciones/liquidaciones" element={<LiquidacionesMes />} />
          <Route path="remuneraciones/liquidaciones/:id" element={<DetalleLiquidacion />} />
          <Route path="remuneraciones/resumen" element={<ResumenAnual />} />
          <Route path="remuneraciones/previred" element={<ExportarPrevired />} />

          {/* Complementarios */}
          <Route path="inventario" element={<Inventario />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="pme" element={<PME />} />
          <Route path="cumplimiento" element={<Cumplimiento />} />

          {/* Admin */}
          <Route path="admin/onboarding" element={<WizardOnboarding />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
