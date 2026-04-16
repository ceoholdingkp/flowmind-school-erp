"use strict";
// ═══════════════════════════════════════════════════════════════
// Flowmind School ERP — Domain Events (Tipos TypeScript)
// packages/shared/src/events.ts
//
// REGLA: Si cambias el payload de un evento, DEBES actualizar
// TODOS los consumidores listados en el catálogo de eventos.
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_NAMES = void 0;
// ─── EVENT NAMES (para usar como constantes) ────────────────
exports.EVENT_NAMES = {
    ALUMNO_MATRICULADO: 'ALUMNO_MATRICULADO',
    ALUMNO_RETIRADO: 'ALUMNO_RETIRADO',
    ALUMNO_ACTUALIZADO: 'ALUMNO_ACTUALIZADO',
    ASISTENCIA_REGISTRADA: 'ASISTENCIA_REGISTRADA',
    ASISTENCIA_BAJO_UMBRAL: 'ASISTENCIA_BAJO_UMBRAL',
    ATRASO_REITERADO: 'ATRASO_REITERADO',
    NOTA_INGRESADA: 'NOTA_INGRESADA',
    NOTA_BAJO_MINIMO: 'NOTA_BAJO_MINIMO',
    PERIODO_CERRADO: 'PERIODO_CERRADO',
    PAGO_REGISTRADO: 'PAGO_REGISTRADO',
    PAGO_MOROSO: 'PAGO_MOROSO',
    FONDO_ALERTA_90: 'FONDO_ALERTA_90',
    RENDICION_ENVIADA: 'RENDICION_ENVIADA',
    LIQUIDACION_GENERADA: 'LIQUIDACION_GENERADA',
    CONTRATO_POR_VENCER: 'CONTRATO_POR_VENCER',
    BIEN_DADO_DE_BAJA: 'BIEN_DADO_DE_BAJA',
    LECCIONARIO_FIRMADO: 'LECCIONARIO_FIRMADO',
    ANOTACION_CREADA: 'ANOTACION_CREADA',
    PROTOCOLO_ACTIVADO: 'PROTOCOLO_ACTIVADO',
    PME_APROBADO: 'PME_APROBADO',
    ACCION_PME_COMPLETADA: 'ACCION_PME_COMPLETADA',
    ITEM_CUMPLIMIENTO_VENCIDO: 'ITEM_CUMPLIMIENTO_VENCIDO',
};
//# sourceMappingURL=events.js.map