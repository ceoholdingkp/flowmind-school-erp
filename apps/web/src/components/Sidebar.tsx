import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardCheck, BookOpen, GraduationCap,
  Heart, BookMarked, DollarSign, TrendingUp, FileText, Truck,
  CreditCard, UserCheck, Clock, Banknote, CalendarDays, Target,
  Package, ShieldCheck, School, ChevronDown, ChevronRight, Menu, X, LogOut,
  ListTree, PlusCircle, Receipt, BarChart2,
  UserPlus, List, PieChart, MessageSquare, Mail, BookCheck, KeyRound, Settings2,
} from 'lucide-react';
import { useUIStore } from '../store/ui.store';
import { useAuthStore } from '../store/auth.store';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
];

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'alumnos',
    label: 'Alumnos',
    icon: <Users size={18} />,
    items: [
      { label: 'Matrícula', icon: <School size={16} />, path: '/matricula' },
      { label: 'MA: Alumnos', icon: <List size={16} />, path: '/matricula/alumnos' },
      { label: 'MA: Nueva', icon: <UserPlus size={16} />, path: '/matricula/nuevo' },
      { label: 'MA: Resumen', icon: <PieChart size={16} />, path: '/matricula/resumen' },
      { label: 'Asistencia', icon: <ClipboardCheck size={16} />, path: '/asistencia' },
      { label: 'AS: Registro', icon: <ClipboardCheck size={16} />, path: '/asistencia/registro' },
      { label: 'AS: Resumen', icon: <BarChart2 size={16} />, path: '/asistencia/resumen' },
      { label: 'Atrasos', icon: <Clock size={16} />, path: '/atrasos' },
    ],
  },
  {
    key: 'academico',
    label: 'Inteligencia Académica',
    icon: <GraduationCap size={18} />,
    items: [
      { label: 'Calificaciones', icon: <BookOpen size={16} />, path: '/calificaciones' },
      { label: 'AC: Libro Notas', icon: <BookOpen size={16} />, path: '/academico/notas' },
      { label: 'AC: Informe Notas', icon: <BarChart2 size={16} />, path: '/academico/informe' },
      { label: 'Convivencia', icon: <Heart size={16} />, path: '/convivencia' },
      { label: 'Libro de Clases', icon: <BookMarked size={16} />, path: '/leccionario' },
    ],
  },
  {
    key: 'finanzas',
    label: 'Finanzas',
    icon: <DollarSign size={18} />,
    items: [
      { label: 'Est. Resultados', icon: <TrendingUp size={16} />, path: '/finanzas/eer' },
      { label: 'Salud Financiera', icon: <DollarSign size={16} />, path: '/finanzas/salud' },
      { label: 'Presupuesto', icon: <FileText size={16} />, path: '/finanzas/presupuesto' },
      { label: 'Conciliación', icon: <ClipboardCheck size={16} />, path: '/finanzas/conciliacion' },
      { label: 'Rendición', icon: <FileText size={16} />, path: '/finanzas/rendicion' },
      { label: 'RE: Plan Cuentas', icon: <ListTree size={16} />, path: '/finanzas/rendicion/cuentas' },
      { label: 'RE: Registrar', icon: <PlusCircle size={16} />, path: '/finanzas/rendicion/movimientos/nuevo' },
      { label: 'RE: Movimientos', icon: <Receipt size={16} />, path: '/finanzas/rendicion/movimientos' },
      { label: 'RE: Resumen', icon: <BarChart2 size={16} />, path: '/finanzas/rendicion/resumen' },
      { label: 'Proveedores', icon: <Truck size={16} />, path: '/finanzas/proveedores' },
      { label: 'Pagos', icon: <CreditCard size={16} />, path: '/finanzas/pagos' },
    ],
  },
  {
    key: 'rrhh',
    label: 'Gestión Humana',
    icon: <UserCheck size={18} />,
    items: [
      { label: 'Funcionarios', icon: <Users size={16} />, path: '/rrhh/funcionarios' },
      { label: 'Asistencia RR.HH.', icon: <Clock size={16} />, path: '/rrhh/asistencia' },
      { label: 'Contratos', icon: <FileText size={16} />, path: '/rrhh/contratos' },
      { label: 'Remuneraciones', icon: <Banknote size={16} />, path: '/rrhh/remuneraciones' },
      { label: 'RE: Liquidaciones', icon: <Banknote size={16} />, path: '/remuneraciones/liquidaciones' },
      { label: 'RE: Resumen', icon: <BarChart2 size={16} />, path: '/remuneraciones/resumen' },
      { label: 'RE: Previred', icon: <Receipt size={16} />, path: '/remuneraciones/previred' },
    ],
  },
  {
    key: 'comunicaciones',
    label: 'Comunicaciones',
    icon: <MessageSquare size={18} />,
    items: [
      { label: 'Comunicados', icon: <MessageSquare size={16} />, path: '/comunicaciones' },
      { label: 'Nuevo Comunicado', icon: <PlusCircle size={16} />, path: '/comunicaciones/nuevo' },
      { label: 'Mensajes', icon: <Mail size={16} />, path: '/comunicaciones/mensajes' },
    ],
  },
  {
    key: 'libro_digital',
    label: 'Libro Digital EDE',
    icon: <BookCheck size={18} />,
    items: [
      { label: 'Panel EDE', icon: <ShieldCheck size={16} />, path: '/ede' },
      { label: 'Firma Digital', icon: <KeyRound size={16} />, path: '/ede/firma' },
    ],
  },
  {
    key: 'complementarios',
    label: 'Complementarios',
    icon: <Target size={18} />,
    items: [
      { label: 'Calendario', icon: <CalendarDays size={16} />, path: '/calendario' },
      { label: 'PME', icon: <Target size={16} />, path: '/pme' },
      { label: 'Inventario', icon: <Package size={16} />, path: '/inventario' },
      { label: 'Cumplimiento', icon: <ShieldCheck size={16} />, path: '/cumplimiento' },
    ],
  },
  {
    key: 'admin',
    label: 'Administración',
    icon: <Settings2 size={18} />,
    items: [
      { label: 'Nuevo Colegio', icon: <School size={16} />, path: '/admin/onboarding' },
    ],
  },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
    isActive
      ? 'bg-[var(--nav-active)] text-[var(--text-primary)] font-medium'
      : 'text-[var(--muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-primary)]'
  }`;

export default function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, expandedGroups, toggleSidebar, closeMobileSidebar, toggleGroup } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close mobile sidebar on nav click
  const onNavClick = () => {
    if (mobileSidebarOpen) closeMobileSidebar();
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen border-r flex flex-col z-40 transition-all duration-200
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'} w-60
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}
    >
      {/* Logo / Toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {!sidebarCollapsed && (
          <button
            onClick={() => { navigate('/dashboard'); onNavClick(); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 bg-[#3b82f6] rounded-lg flex items-center justify-center text-xs font-bold text-white">F</div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>FlowMind</span>
          </button>
        )}
        {/* On desktop: collapse toggle. On mobile: close button */}
        <button
          onClick={mobileSidebarOpen ? closeMobileSidebar : toggleSidebar}
          className="p-1.5 rounded-lg transition-colors ml-auto"
          style={{ color: 'var(--muted)' }}
          aria-label={sidebarCollapsed && !mobileSidebarOpen ? 'Expandir menú' : 'Colapsar menú'}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          {sidebarCollapsed && !mobileSidebarOpen ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Top level items */}
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} to={item.path} className={linkClass} title={item.label} onClick={onNavClick}>
            <span className="shrink-0">{item.icon}</span>
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />

        {/* Groups */}
        {NAV_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          return (
            <div key={group.key}>
              <button
                onClick={() => !sidebarCollapsed && toggleGroup(group.key)}
                title={group.label}
                aria-label={group.label}
                aria-expanded={!sidebarCollapsed ? isExpanded : undefined}
                aria-controls={!sidebarCollapsed ? `${group.key}-items` : undefined}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
              >
                <span className="shrink-0">{group.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </>
                )}
              </button>
              {!sidebarCollapsed && isExpanded && (
                <div id={`${group.key}-items`} className="ml-3 pl-3 border-l space-y-0.5 mt-0.5" style={{ borderColor: 'var(--border)' }}>
                  {group.items.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClass} title={item.label} onClick={onNavClick}>
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border)' }}>
        {!sidebarCollapsed && user && (
          <div className="px-3 py-2 text-xs truncate" style={{ color: 'var(--muted)' }}>
            {user.nombre} {user.apellidos}
            <div className="text-[10px] text-[#3b82f6] uppercase">{user.rol}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
