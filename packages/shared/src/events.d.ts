export interface BaseEvent {
    type: string;
    timestamp: Date;
    userId: string;
    tenantId: string;
    correlationId: string;
}
export interface AlumnoMatriculadoEvent extends BaseEvent {
    type: 'ALUMNO_MATRICULADO';
    payload: {
        alumnoId: string;
        run: string;
        nombreCompleto: string;
        cursoId: string;
        cursoNombre: string;
        esPIE: boolean;
        esPrioritario: boolean;
        esPreferente: boolean;
        apoderadoEmail: string | null;
        apoderadoTelefono: string | null;
    };
}
export interface AlumnoRetiradoEvent extends BaseEvent {
    type: 'ALUMNO_RETIRADO';
    payload: {
        alumnoId: string;
        run: string;
        nombreCompleto: string;
        cursoId: string;
        motivoRetiro: string;
        fechaRetiro: string;
    };
}
export interface AlumnoActualizadoEvent extends BaseEvent {
    type: 'ALUMNO_ACTUALIZADO';
    payload: {
        alumnoId: string;
        camposModificados: string[];
    };
}
export interface AsistenciaRegistradaEvent extends BaseEvent {
    type: 'ASISTENCIA_REGISTRADA';
    payload: {
        cursoId: string;
        cursoNombre: string;
        fecha: string;
        tramoHorario: number | null;
        totalAlumnos: number;
        totalPresentes: number;
        totalAusentes: number;
        totalAtrasos: number;
        totalJustificados: number;
        porcentajeAsistencia: number;
    };
}
export interface AsistenciaBajoUmbralEvent extends BaseEvent {
    type: 'ASISTENCIA_BAJO_UMBRAL';
    payload: {
        alumnoId: string;
        run: string;
        nombreCompleto: string;
        cursoId: string;
        cursoNombre: string;
        porcentajeAcumulado: number;
        umbralMinimo: number;
        apoderadoEmail: string | null;
        apoderadoTelefono: string | null;
    };
}
export interface AtrasoReiteradoEvent extends BaseEvent {
    type: 'ATRASO_REITERADO';
    payload: {
        alumnoId: string;
        run: string;
        nombreCompleto: string;
        cursoId: string;
        cursoNombre: string;
        totalAtrasosMes: number;
        totalAtrasosAnio: number;
        apoderadoEmail: string | null;
        apoderadoTelefono: string | null;
    };
}
export interface NotaIngresadaEvent extends BaseEvent {
    type: 'NOTA_INGRESADA';
    payload: {
        notaId: string;
        alumnoId: string;
        nombreAlumno: string;
        asignaturaId: string;
        asignaturaNombre: string;
        cursoId: string;
        valor: number;
        tipo: string;
        promedioAsignaturaActualizado: number;
        promedioGeneralActualizado: number;
    };
}
export interface NotaBajoMinimoEvent extends BaseEvent {
    type: 'NOTA_BAJO_MINIMO';
    payload: {
        alumnoId: string;
        nombreAlumno: string;
        asignaturaId: string;
        asignaturaNombre: string;
        cursoId: string;
        cursoNombre: string;
        promedioAsignatura: number;
        notaMinima: number;
        apoderadoEmail: string | null;
    };
}
export interface PeriodoCerradoEvent extends BaseEvent {
    type: 'PERIODO_CERRADO';
    payload: {
        anio: number;
        semestre: number;
        totalAlumnos: number;
        totalAprobados: number;
        totalReprobados: number;
        promedioGeneral: number;
    };
}
export interface PagoRegistradoEvent extends BaseEvent {
    type: 'PAGO_REGISTRADO';
    payload: {
        pagoId: string;
        alumnoId: string;
        nombreAlumno: string;
        monto: number;
        metodo: string;
        referencia: string | null;
        cuotaNumero: number | null;
        mesCorresponde: number | null;
        apoderadoEmail: string | null;
        apoderadoTelefono: string | null;
    };
}
export interface PagoMorosoEvent extends BaseEvent {
    type: 'PAGO_MOROSO';
    payload: {
        alumnoId: string;
        nombreAlumno: string;
        cursoNombre: string;
        mesesMorosos: number;
        montoAdeudado: number;
        apoderadoEmail: string | null;
        apoderadoTelefono: string | null;
    };
}
export interface FondoAlerta90Event extends BaseEvent {
    type: 'FONDO_ALERTA_90';
    payload: {
        fondoId: string;
        fondoNombre: string;
        presupuestoAnual: number;
        gastoAcumulado: number;
        porcentajeEjecucion: number;
    };
}
export interface RendicionEnviadaEvent extends BaseEvent {
    type: 'RENDICION_ENVIADA';
    payload: {
        rendicionId: string;
        fondoId: string;
        fondoNombre: string;
        periodo: string;
        anio: number;
        totalIngresos: number;
        totalGastos: number;
        saldo: number;
    };
}
export interface LiquidacionGeneradaEvent extends BaseEvent {
    type: 'LIQUIDACION_GENERADA';
    payload: {
        liquidacionId: string;
        funcionarioId: string;
        nombreFuncionario: string;
        mes: number;
        anio: number;
        totalHaberes: number;
        totalDescuentos: number;
        liquidoAPago: number;
        fondoImputacion: Array<{
            fondoId: string;
            fondoNombre: string;
            monto: number;
        }>;
    };
}
export interface ContratoPorVencerEvent extends BaseEvent {
    type: 'CONTRATO_POR_VENCER';
    payload: {
        contratoId: string;
        funcionarioId: string;
        nombreFuncionario: string;
        cargo: string;
        fechaTermino: string;
        diasRestantes: number;
    };
}
export interface BienDadoDeBajaEvent extends BaseEvent {
    type: 'BIEN_DADO_DE_BAJA';
    payload: {
        bienId: string;
        codigoInventario: string;
        nombre: string;
        categoria: string;
        valorAdquisicion: number;
        motivoBaja: string;
        fondoCompra: string | null;
    };
}
export interface LeccionarioFirmadoEvent extends BaseEvent {
    type: 'LECCIONARIO_FIRMADO';
    payload: {
        leccionarioId: string;
        docenteId: string;
        nombreDocente: string;
        cursoId: string;
        cursoNombre: string;
        asignaturaId: string;
        asignaturaNombre: string;
        fecha: string;
    };
}
export interface AnotacionCreadaEvent extends BaseEvent {
    type: 'ANOTACION_CREADA';
    payload: {
        anotacionId: string;
        alumnoId: string;
        nombreAlumno: string;
        cursoId: string;
        cursoNombre: string;
        tipo: 'POSITIVA' | 'NEGATIVA';
        gravedad: 'LEVE' | 'GRAVE' | 'GRAVISIMA' | null;
        categoria: string;
        visiblePortal: boolean;
    };
}
export interface ProtocoloActivadoEvent extends BaseEvent {
    type: 'PROTOCOLO_ACTIVADO';
    payload: {
        anotacionId: string;
        alumnoId: string;
        nombreAlumno: string;
        tipoProtocolo: string;
    };
}
export interface PMEAprobadoEvent extends BaseEvent {
    type: 'PME_APROBADO';
    payload: {
        pmeId: string;
        anio: number;
        totalAcciones: number;
        presupuestoTotal: number;
    };
}
export interface AccionPMECompletadaEvent extends BaseEvent {
    type: 'ACCION_PME_COMPLETADA';
    payload: {
        accionId: string;
        descripcion: string;
        dimension: string;
        fondoId: string | null;
    };
}
export interface ItemCumplimientoVencidoEvent extends BaseEvent {
    type: 'ITEM_CUMPLIMIENTO_VENCIDO';
    payload: {
        itemId: string;
        nombre: string;
        area: string;
        plazoLegal: string;
        diasVencido: number;
    };
}
export type DomainEvent = AlumnoMatriculadoEvent | AlumnoRetiradoEvent | AlumnoActualizadoEvent | AsistenciaRegistradaEvent | AsistenciaBajoUmbralEvent | AtrasoReiteradoEvent | NotaIngresadaEvent | NotaBajoMinimoEvent | PeriodoCerradoEvent | PagoRegistradoEvent | PagoMorosoEvent | FondoAlerta90Event | RendicionEnviadaEvent | LiquidacionGeneradaEvent | ContratoPorVencerEvent | BienDadoDeBajaEvent | LeccionarioFirmadoEvent | AnotacionCreadaEvent | ProtocoloActivadoEvent | PMEAprobadoEvent | AccionPMECompletadaEvent | ItemCumplimientoVencidoEvent;
export declare const EVENT_NAMES: {
    readonly ALUMNO_MATRICULADO: "ALUMNO_MATRICULADO";
    readonly ALUMNO_RETIRADO: "ALUMNO_RETIRADO";
    readonly ALUMNO_ACTUALIZADO: "ALUMNO_ACTUALIZADO";
    readonly ASISTENCIA_REGISTRADA: "ASISTENCIA_REGISTRADA";
    readonly ASISTENCIA_BAJO_UMBRAL: "ASISTENCIA_BAJO_UMBRAL";
    readonly ATRASO_REITERADO: "ATRASO_REITERADO";
    readonly NOTA_INGRESADA: "NOTA_INGRESADA";
    readonly NOTA_BAJO_MINIMO: "NOTA_BAJO_MINIMO";
    readonly PERIODO_CERRADO: "PERIODO_CERRADO";
    readonly PAGO_REGISTRADO: "PAGO_REGISTRADO";
    readonly PAGO_MOROSO: "PAGO_MOROSO";
    readonly FONDO_ALERTA_90: "FONDO_ALERTA_90";
    readonly RENDICION_ENVIADA: "RENDICION_ENVIADA";
    readonly LIQUIDACION_GENERADA: "LIQUIDACION_GENERADA";
    readonly CONTRATO_POR_VENCER: "CONTRATO_POR_VENCER";
    readonly BIEN_DADO_DE_BAJA: "BIEN_DADO_DE_BAJA";
    readonly LECCIONARIO_FIRMADO: "LECCIONARIO_FIRMADO";
    readonly ANOTACION_CREADA: "ANOTACION_CREADA";
    readonly PROTOCOLO_ACTIVADO: "PROTOCOLO_ACTIVADO";
    readonly PME_APROBADO: "PME_APROBADO";
    readonly ACCION_PME_COMPLETADA: "ACCION_PME_COMPLETADA";
    readonly ITEM_CUMPLIMIENTO_VENCIDO: "ITEM_CUMPLIMIENTO_VENCIDO";
};
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
//# sourceMappingURL=events.d.ts.map