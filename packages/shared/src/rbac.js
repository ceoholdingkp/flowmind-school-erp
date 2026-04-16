"use strict";
// ═══════════════════════════════════════════════════════════════
// Flowmind School ERP — RBAC Permissions Matrix
// packages/shared/src/rbac.ts
//
// Cada rol tiene una lista de permisos. El guard de NestJS
// verifica si el usuario tiene el permiso requerido por el endpoint.
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = void 0;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.PERMISSIONS = {
    // ─── SISTEMA ─────────────────────────────────────────────
    'sistema:config:read': 'Ver configuración del establecimiento',
    'sistema:config:write': 'Modificar configuración del establecimiento',
    'sistema:usuarios:read': 'Ver lista de usuarios',
    'sistema:usuarios:write': 'Crear/editar/desactivar usuarios',
    'sistema:cursos:read': 'Ver cursos',
    'sistema:cursos:write': 'Crear/editar cursos',
    'sistema:asignaturas:read': 'Ver asignaturas',
    'sistema:asignaturas:write': 'Crear/editar asignaturas',
    // ─── ALUMNOS ─────────────────────────────────────────────
    'alumnos:read': 'Ver lista y fichas de alumnos',
    'alumnos:write': 'Matricular, editar datos de alumnos',
    'alumnos:retirar': 'Retirar/trasladar alumnos',
    'alumnos:import': 'Importar nómina de alumnos',
    'alumnos:export:sige': 'Exportar matrícula formato SIGE',
    // ─── ASISTENCIA ──────────────────────────────────────────
    'asistencia:read': 'Ver registros de asistencia',
    'asistencia:write': 'Registrar asistencia',
    'asistencia:dashboard': 'Ver dashboard de asistencia',
    'asistencia:export': 'Exportar asistencia SIGE',
    // ─── ATRASOS ─────────────────────────────────────────────
    'atrasos:read': 'Ver registros de atrasos',
    'atrasos:write': 'Registrar atrasos',
    // ─── CALIFICACIONES ──────────────────────────────────────
    'notas:read': 'Ver notas (propios cursos)',
    'notas:read:all': 'Ver notas (todos los cursos)',
    'notas:write': 'Ingresar/editar notas',
    'notas:bloquear': 'Bloquear/desbloquear periodo',
    'notas:dashboard': 'Ver dashboard de calificaciones',
    'notas:import': 'Importar notas masivamente',
    'notas:export': 'Exportar actas SIGE',
    // ─── CONVIVENCIA ─────────────────────────────────────────
    'convivencia:read': 'Ver anotaciones',
    'convivencia:write': 'Crear anotaciones',
    'convivencia:protocolos': 'Activar/gestionar protocolos',
    // ─── LECCIONARIO ─────────────────────────────────────────
    'leccionario:read': 'Ver leccionarios',
    'leccionario:write': 'Registrar y firmar leccionario',
    'leccionario:revision': 'Revisar leccionarios (UTP)',
    // ─── FINANZAS ────────────────────────────────────────────
    'finanzas:read': 'Ver información financiera',
    'finanzas:write': 'Registrar movimientos financieros',
    'finanzas:eer': 'Ver Estado de Resultados',
    'finanzas:presupuesto:read': 'Ver presupuesto',
    'finanzas:presupuesto:write': 'Crear/editar presupuesto',
    'finanzas:conciliacion': 'Realizar conciliación bancaria',
    'finanzas:rendicion': 'Generar rendiciones SuperEduc',
    'finanzas:rendicion:aprobar': 'Aprobar rendiciones',
    'finanzas:pagos:read': 'Ver pagos de aranceles',
    'finanzas:pagos:write': 'Registrar pagos',
    'finanzas:proveedores': 'Gestionar proveedores y contratos',
    // ─── RRHH ────────────────────────────────────────────────
    'rrhh:funcionarios:read': 'Ver fichas de personal',
    'rrhh:funcionarios:write': 'Crear/editar fichas de personal',
    'rrhh:marcas:read': 'Ver marcas de asistencia personal',
    'rrhh:marcas:write': 'Registrar marcas',
    'rrhh:liquidaciones:read': 'Ver liquidaciones',
    'rrhh:liquidaciones:write': 'Generar liquidaciones',
    'rrhh:liquidaciones:aprobar': 'Aprobar liquidaciones',
    'rrhh:contratos:read': 'Ver contratos laborales',
    'rrhh:contratos:write': 'Crear/editar contratos laborales',
    'rrhh:export': 'Exportar Previred, LRE',
    // ─── INVENTARIO ──────────────────────────────────────────
    'inventario:read': 'Ver bienes del inventario',
    'inventario:write': 'Registrar/editar bienes',
    'inventario:baja': 'Dar de baja bienes',
    'inventario:import': 'Importar inventario',
    'inventario:export': 'Exportar inventario',
    // ─── PME ─────────────────────────────────────────────────
    'pme:read': 'Ver Plan de Mejoramiento',
    'pme:write': 'Crear/editar acciones PME',
    'pme:aprobar': 'Aprobar PME',
    // ─── CUMPLIMIENTO ────────────────────────────────────────
    'cumplimiento:read': 'Ver checklist de cumplimiento',
    'cumplimiento:write': 'Actualizar items de cumplimiento',
    'cumplimiento:fiscalizacion': 'Registrar fiscalizaciones',
    // ─── CALENDARIO ──────────────────────────────────────────
    'calendario:read': 'Ver eventos del calendario',
    'calendario:write': 'Crear/editar eventos',
    // ─── MATRÍCULA Y SUBVENCIÓN ──────────────────────────────
    'matricula:read': 'Ver matrículas y proyección de subvención',
    'matricula:write': 'Gestionar matrículas',
    // ─── DASHBOARD ───────────────────────────────────────────
    'dashboard:read': 'Ver dashboard principal',
    'dashboard:alertas': 'Ver y gestionar alertas',
    // ─── PORTAL APODERADO ────────────────────────────────────
    'portal:notas': 'Ver notas de sus pupilos',
    'portal:asistencia': 'Ver asistencia de sus pupilos',
    'portal:pagos': 'Ver estado de cuenta y pagar',
    'portal:mensajes': 'Enviar/recibir mensajes',
    'portal:calendario': 'Ver eventos públicos',
};
// ─── ROLES Y SUS PERMISOS ────────────────────────────────────
exports.ROLE_PERMISSIONS = {
    SUPER_ADMIN: Object.keys(exports.PERMISSIONS), // ACCESO TOTAL
    SOSTENEDOR: [
        'dashboard:read', 'dashboard:alertas',
        'finanzas:read', 'finanzas:eer', 'finanzas:presupuesto:read', 'finanzas:rendicion', 'finanzas:rendicion:aprobar', 'finanzas:pagos:read',
        'alumnos:read',
        'notas:read:all', 'notas:dashboard',
        'asistencia:dashboard',
        'rrhh:funcionarios:read', 'rrhh:liquidaciones:read', 'rrhh:liquidaciones:aprobar',
        'inventario:read',
        'pme:read', 'pme:aprobar',
        'cumplimiento:read',
        'calendario:read',
        'sistema:config:read',
    ],
    DIRECTOR: [
        'dashboard:read', 'dashboard:alertas',
        'sistema:config:read', 'sistema:config:write', 'sistema:usuarios:read', 'sistema:usuarios:write',
        'sistema:cursos:read', 'sistema:cursos:write', 'sistema:asignaturas:read', 'sistema:asignaturas:write',
        'alumnos:read', 'alumnos:write', 'alumnos:retirar', 'alumnos:import', 'alumnos:export:sige',
        'asistencia:read', 'asistencia:dashboard', 'asistencia:export',
        'atrasos:read',
        'notas:read:all', 'notas:dashboard', 'notas:bloquear', 'notas:export',
        'convivencia:read', 'convivencia:protocolos',
        'leccionario:read', 'leccionario:revision',
        'finanzas:read', 'finanzas:eer', 'finanzas:presupuesto:read', 'finanzas:presupuesto:write',
        'finanzas:rendicion', 'finanzas:rendicion:aprobar', 'finanzas:pagos:read', 'finanzas:proveedores',
        'rrhh:funcionarios:read', 'rrhh:funcionarios:write', 'rrhh:marcas:read',
        'rrhh:liquidaciones:read', 'rrhh:liquidaciones:aprobar', 'rrhh:contratos:read', 'rrhh:contratos:write',
        'inventario:read', 'inventario:write', 'inventario:baja',
        'pme:read', 'pme:write', 'pme:aprobar',
        'cumplimiento:read', 'cumplimiento:write', 'cumplimiento:fiscalizacion',
        'calendario:read', 'calendario:write',
    ],
    UTP: [
        'dashboard:read',
        'alumnos:read',
        'asistencia:read', 'asistencia:dashboard',
        'atrasos:read',
        'notas:read:all', 'notas:dashboard', 'notas:bloquear', 'notas:export', 'notas:import',
        'convivencia:read',
        'leccionario:read', 'leccionario:revision',
        'pme:read', 'pme:write',
        'calendario:read', 'calendario:write',
        'sistema:cursos:read', 'sistema:asignaturas:read', 'sistema:asignaturas:write',
    ],
    INSPECTOR: [
        'dashboard:read',
        'alumnos:read',
        'asistencia:read', 'asistencia:write', 'asistencia:dashboard',
        'atrasos:read', 'atrasos:write',
        'convivencia:read', 'convivencia:write', 'convivencia:protocolos',
        'leccionario:read',
        'calendario:read',
    ],
    DOCENTE: [
        'alumnos:read',
        'asistencia:read', 'asistencia:write',
        'notas:read', 'notas:write',
        'convivencia:read', 'convivencia:write',
        'leccionario:read', 'leccionario:write',
        'calendario:read',
    ],
    DOCENTE_JEFE: [
        'alumnos:read',
        'asistencia:read', 'asistencia:write', 'asistencia:dashboard',
        'atrasos:read',
        'notas:read', 'notas:write',
        'convivencia:read', 'convivencia:write',
        'leccionario:read', 'leccionario:write',
        'calendario:read',
    ],
    PROFESIONAL_PIE: [
        'alumnos:read',
        'notas:read',
        'asistencia:read',
        'convivencia:read',
        'calendario:read',
    ],
    ADMINISTRATIVO: [
        'dashboard:read', 'dashboard:alertas',
        'alumnos:read',
        'finanzas:read', 'finanzas:write', 'finanzas:eer', 'finanzas:presupuesto:read', 'finanzas:presupuesto:write',
        'finanzas:conciliacion', 'finanzas:rendicion', 'finanzas:pagos:read', 'finanzas:pagos:write', 'finanzas:proveedores',
        'rrhh:funcionarios:read', 'rrhh:funcionarios:write', 'rrhh:marcas:read', 'rrhh:marcas:write',
        'rrhh:liquidaciones:read', 'rrhh:liquidaciones:write', 'rrhh:contratos:read', 'rrhh:contratos:write', 'rrhh:export',
        'inventario:read', 'inventario:write', 'inventario:baja', 'inventario:import', 'inventario:export',
        'cumplimiento:read', 'cumplimiento:write',
        'calendario:read', 'calendario:write',
    ],
    SECRETARIA: [
        'alumnos:read', 'alumnos:write', 'alumnos:import', 'alumnos:export:sige',
        'asistencia:read',
        'notas:read:all',
        'atrasos:read',
        'calendario:read', 'calendario:write',
        'finanzas:pagos:read',
    ],
    APODERADO: [
        'portal:notas', 'portal:asistencia', 'portal:pagos', 'portal:mensajes', 'portal:calendario',
    ],
    ALUMNO_ROL: [
        'portal:notas', 'portal:asistencia', 'portal:calendario',
    ],
};
// ─── HELPER: Verificar permiso ──────────────────────────────
function hasPermission(rol, permission) {
    const permisos = exports.ROLE_PERMISSIONS[rol];
    if (!permisos)
        return false;
    return permisos.includes(permission);
}
function hasAnyPermission(rol, permissions) {
    return permissions.some(p => hasPermission(rol, p));
}
//# sourceMappingURL=rbac.js.map