import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matricula from './pages/Matricula';
import Asistencia from './pages/Asistencia';
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

// Portal Apoderado
import LoginApoderado from './pages/apoderado/LoginApoderado';
import PortalApoderado from './pages/apoderado/PortalApoderado';

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

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Auth ── */}
        <Route path="/login" element={<Login />} />

        {/* ── Portal Apoderado ── */}
        <Route path="/apoderado/login" element={<LoginApoderado />} />
        <Route path="/apoderado" element={
          <ApoderadoRoute>
            <PortalApoderado />
          </ApoderadoRoute>
        } />

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
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="atrasos" element={<Atrasos />} />

          {/* Académico */}
          <Route path="calificaciones" element={<Calificaciones />} />
          <Route path="convivencia" element={<Convivencia />} />
          <Route path="leccionario" element={<Leccionario />} />

          {/* Finanzas */}
          <Route path="finanzas/eer" element={<EER />} />
          <Route path="finanzas/salud" element={<SaludFinanciera />} />
          <Route path="finanzas/presupuesto" element={<Presupuesto />} />
          <Route path="finanzas/conciliacion" element={<Conciliacion />} />
          <Route path="finanzas/rendicion" element={<Rendicion />} />
          <Route path="finanzas/proveedores" element={<Proveedores />} />
          <Route path="finanzas/pagos" element={<Pagos />} />

          {/* RRHH */}
          <Route path="rrhh/funcionarios" element={<Funcionarios />} />
          <Route path="rrhh/asistencia" element={<AsistenciaRRHH />} />
          <Route path="rrhh/remuneraciones" element={<Remuneraciones />} />
          <Route path="rrhh/contratos" element={<Contratos />} />

          {/* Complementarios */}
          <Route path="inventario" element={<Inventario />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="pme" element={<PME />} />
          <Route path="cumplimiento" element={<Cumplimiento />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
