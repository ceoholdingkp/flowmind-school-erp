-- CreateEnum
CREATE TYPE "TipoEstablecimiento" AS ENUM ('MUNICIPAL', 'PARTICULAR_SUBVENCIONADO', 'PARTICULAR_PAGADO', 'SLEP');

-- CreateEnum
CREATE TYPE "PeriodoEval" AS ENUM ('SEMESTRAL', 'TRIMESTRAL');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'SOSTENEDOR', 'DIRECTOR', 'UTP', 'INSPECTOR', 'DOCENTE', 'DOCENTE_JEFE', 'PROFESIONAL_PIE', 'ADMINISTRATIVO', 'SECRETARIA', 'APODERADO', 'ALUMNO_ROL');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoMatricula" AS ENUM ('ACTIVA', 'RETIRADO', 'TRASLADADO', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "TipoFuncionario" AS ENUM ('DOCENTE', 'ASISTENTE_PROFESIONAL', 'PARADOCENTE', 'AUXILIAR', 'ADMINISTRATIVO', 'DIRECTIVO');

-- CreateEnum
CREATE TYPE "TramoCarrera" AS ENUM ('INICIAL', 'TEMPRANO', 'AVANZADO', 'EXPERTO_I', 'EXPERTO_II');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('INDEFINIDO', 'PLAZO_FIJO', 'REEMPLAZO', 'HONORARIOS');

-- CreateEnum
CREATE TYPE "EstadoFuncionario" AS ENUM ('ACTIVO', 'CON_LICENCIA', 'DESVINCULADO');

-- CreateEnum
CREATE TYPE "TipoNota" AS ENUM ('SUMATIVA', 'FORMATIVA', 'TALLER', 'EXAMEN');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('PRESENTE', 'AUSENTE', 'ATRASO', 'JUSTIFICADO', 'RETIRADO_ANTICIPADO');

-- CreateEnum
CREATE TYPE "TipoAtraso" AS ENUM ('PRIMER_BLOQUE', 'ENTRE_BLOQUES');

-- CreateEnum
CREATE TYPE "TipoAnotacion" AS ENUM ('POSITIVA', 'NEGATIVA');

-- CreateEnum
CREATE TYPE "Gravedad" AS ENUM ('LEVE', 'GRAVE', 'GRAVISIMA');

-- CreateEnum
CREATE TYPE "EstadoLeccionario" AS ENUM ('PENDIENTE', 'FIRMADO', 'REVISADO_UTP');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "FuenteDato" AS ENUM ('MANUAL', 'CONCILIACION_BANCARIA', 'IMPORTACION_SII', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('WEBPAY', 'KHIPU', 'FLOW', 'TRANSFERENCIA', 'EFECTIVO', 'CHEQUE');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('BORRADOR', 'APROBADA', 'PAGADA');

-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('VIGENTE', 'TERMINADO', 'POR_VENCER');

-- CreateEnum
CREATE TYPE "CategoriaBien" AS ENUM ('TECNOLOGICO', 'FUNGIBLE', 'MOBILIARIO', 'ACTIVO_FIJO');

-- CreateEnum
CREATE TYPE "EstadoBien" AS ENUM ('BUENO', 'REGULAR', 'MALO', 'DADO_DE_BAJA');

-- CreateEnum
CREATE TYPE "EstadoRendicion" AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADA_DIRECTOR', 'ENVIADA_SUPEREDUC', 'APROBADA_SUPEREDUC', 'OBSERVADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoPresupuesto" AS ENUM ('BORRADOR', 'APROBADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoPME" AS ENUM ('BORRADOR', 'APROBADO', 'EN_EJECUCION', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoCumplimiento" AS ENUM ('CUMPLIDO', 'PENDIENTE', 'VENCIDO', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "AreaCumplimiento" AS ENUM ('ACADEMICA', 'FINANCIERA', 'LABORAL', 'CONVIVENCIA', 'INFRAESTRUCTURA');

-- CreateEnum
CREATE TYPE "SeveridadAlerta" AS ENUM ('CRITICA', 'ADVERTENCIA', 'INFO');

-- CreateEnum
CREATE TYPE "TipoDia" AS ENUM ('NORMAL', 'LICENCIA_MEDICA', 'PERMISO', 'FERIADO', 'VACACIONES', 'AUSENTE_INJUSTIFICADO');

-- CreateTable
CREATE TABLE "Establecimiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rbd" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "sostenedorRut" TEXT NOT NULL,
    "sostenedorNombre" TEXT NOT NULL,
    "tipo" "TipoEstablecimiento" NOT NULL,
    "logo" TEXT,
    "anioEscolarActivo" INTEGER NOT NULL,
    "periodoEvaluacion" "PeriodoEval" NOT NULL DEFAULT 'SEMESTRAL',
    "escalaMin" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "escalaMax" DECIMAL(65,30) NOT NULL DEFAULT 7.0,
    "notaAprobacion" DECIMAL(65,30) NOT NULL DEFAULT 4.0,
    "asistenciaMinima" DECIMAL(65,30) NOT NULL DEFAULT 85.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "run" TEXT,
    "rol" "Rol" NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "ultimoLogin" TIMESTAMP(3),
    "refreshToken" TEXT,
    "funcionarioId" TEXT,
    "apoderadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sala" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER,
    "tipo" TEXT NOT NULL DEFAULT 'aula',
    "establecimientoId" TEXT NOT NULL,

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alumno" (
    "id" TEXT NOT NULL,
    "run" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "genero" "Genero" NOT NULL,
    "nacionalidad" TEXT NOT NULL DEFAULT 'Chilena',
    "direccion" TEXT,
    "comuna" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "foto" TEXT,
    "cursoId" TEXT,
    "fechaMatricula" TIMESTAMP(3) NOT NULL,
    "estadoMatricula" "EstadoMatricula" NOT NULL DEFAULT 'ACTIVA',
    "numeroMatricula" INTEGER NOT NULL,
    "esPIE" BOOLEAN NOT NULL DEFAULT false,
    "esPrioritario" BOOLEAN NOT NULL DEFAULT false,
    "esPreferente" BOOLEAN NOT NULL DEFAULT false,
    "grupoSanguineo" TEXT,
    "previsionSalud" TEXT,
    "alergias" TEXT,
    "enfermedadesCronicas" TEXT,
    "medicamentos" TEXT,
    "colegioAnterior" TEXT,
    "motivoRetiro" TEXT,
    "fechaRetiro" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apoderado" (
    "id" TEXT NOT NULL,
    "run" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "ocupacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apoderado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApoderadoAlumno" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "apoderadoId" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "esTitular" BOOLEAN NOT NULL DEFAULT false,
    "esEmergencia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApoderadoAlumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "run" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "tipo" "TipoFuncionario" NOT NULL,
    "cargo" TEXT NOT NULL,
    "tituloProfesional" TEXT,
    "universidad" TEXT,
    "especialidadPIE" TEXT,
    "tramoCarrera" "TramoCarrera",
    "horasContrato" INTEGER NOT NULL,
    "horasLectivas" INTEGER,
    "horasNoLectivas" INTEGER,
    "tipoContrato" "TipoContrato" NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "sueldoBase" DECIMAL(65,30),
    "afp" TEXT,
    "isapre" TEXT,
    "cuentaBancaria" TEXT,
    "banco" TEXT,
    "estado" "EstadoFuncionario" NOT NULL DEFAULT 'ACTIVO',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "letra" TEXT NOT NULL,
    "tipoEnsenanza" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "establecimientoId" TEXT NOT NULL,
    "docenteJefeId" TEXT,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignatura" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "horasSemanales" INTEGER NOT NULL,
    "planEstudios" TEXT,

    CONSTRAINT "Asignatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignaturaDocente" (
    "id" TEXT NOT NULL,
    "asignaturaId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,

    CONSTRAINT "AsignaturaDocente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioBloque" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "salaId" TEXT,
    "diaSemana" INTEGER NOT NULL,
    "bloqueNumero" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "asignaturaId" TEXT,
    "docenteId" TEXT,
    "anio" INTEGER NOT NULL,

    CONSTRAINT "HorarioBloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "asignaturaId" TEXT NOT NULL,
    "tipo" "TipoNota" NOT NULL,
    "nombreEvaluacion" TEXT NOT NULL,
    "ponderacion" DECIMAL(65,30) NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "semestre" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "ingresadaPor" TEXT NOT NULL,
    "bloqueada" BOOLEAN NOT NULL DEFAULT false,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tramoHorario" INTEGER,
    "estado" "EstadoAsistencia" NOT NULL,
    "horaLlegada" TIMESTAMP(3),
    "horaRetiro" TIMESTAMP(3),
    "justificacion" TEXT,
    "documentoAdj" TEXT,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atraso" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaLlegada" TIMESTAMP(3) NOT NULL,
    "minutosAtraso" INTEGER NOT NULL,
    "bloqueHorario" INTEGER NOT NULL,
    "tipo" "TipoAtraso" NOT NULL,
    "justificado" BOOLEAN NOT NULL DEFAULT false,
    "justificacion" TEXT,
    "registradoPor" TEXT NOT NULL,
    "notificacionEnviada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atraso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anotacion" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "tipo" "TipoAnotacion" NOT NULL,
    "gravedad" "Gravedad",
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "registradaPor" TEXT NOT NULL,
    "protocoloActivo" TEXT,
    "entrevistas" JSONB,
    "compromisos" JSONB,
    "visiblePortal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leccionario" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "asignaturaId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "bloqueHorario" INTEGER NOT NULL,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "objetivo" TEXT,
    "contenido" TEXT NOT NULL,
    "actividades" TEXT,
    "recursos" TEXT,
    "observaciones" TEXT,
    "firmaDigital" TIMESTAMP(3),
    "estado" "EstadoLeccionario" NOT NULL DEFAULT 'PENDIENTE',
    "planificacionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leccionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaNEE" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "profesionalId" TEXT,
    "planAdecuacion" JSONB,
    "seguimientos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FichaNEE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fondo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "presupuestoAnual" DECIMAL(65,30) NOT NULL,
    "anio" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "establecimientoId" TEXT NOT NULL,

    CONSTRAINT "Fondo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoFinanciero" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "fondoId" TEXT,
    "monto" DECIMAL(65,30) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "descripcion" TEXT,
    "documentoTributarioId" TEXT,
    "numeroFactura" TEXT,
    "rutProveedor" TEXT,
    "fuenteDato" "FuenteDato" NOT NULL DEFAULT 'MANUAL',
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "conciliacionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoFinanciero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "descripcion" TEXT,
    "cuotaNumero" INTEGER,
    "mesCorresponde" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conciliacion" (
    "id" TEXT NOT NULL,
    "cuentaBancaria" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "archivoOriginal" TEXT,
    "totalMovBanco" INTEGER NOT NULL,
    "totalConciliados" INTEGER NOT NULL DEFAULT 0,
    "totalPendientes" INTEGER NOT NULL DEFAULT 0,
    "diferencia" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'EN_PROCESO',
    "realizadaPor" TEXT NOT NULL,
    "fechaConciliacion" TIMESTAMP(3),
    "detalles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conciliacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rendicion" (
    "id" TEXT NOT NULL,
    "fondoId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "mesInicio" INTEGER NOT NULL,
    "mesFin" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "totalIngresos" DECIMAL(65,30) NOT NULL,
    "totalGastos" DECIMAL(65,30) NOT NULL,
    "saldo" DECIMAL(65,30) NOT NULL,
    "estado" "EstadoRendicion" NOT NULL DEFAULT 'BORRADOR',
    "fechaEnvio" TIMESTAMP(3),
    "observacionesSuperEduc" TEXT,
    "aprobadoPor" TEXT,
    "archivoGenerado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rendicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'BORRADOR',
    "aprobadoPor" TEXT,
    "fechaAprobacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoLinea" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "fondoId" TEXT NOT NULL,
    "categoriaGasto" TEXT NOT NULL,
    "montoAnual" DECIMAL(65,30) NOT NULL,
    "montoMensual" JSONB,

    CONSTRAINT "PresupuestoLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "giro" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "contactoNombre" TEXT,
    "cuentaBancaria" TEXT,
    "banco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoProveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "numeroContrato" TEXT,
    "tipoServicio" TEXT NOT NULL,
    "montoTotal" DECIMAL(65,30),
    "montoMensual" DECIMAL(65,30),
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaTermino" TIMESTAMP(3),
    "fondoImputacion" TEXT,
    "estado" "EstadoContrato" NOT NULL DEFAULT 'VIGENTE',
    "documento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liquidacion" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "sueldoBase" DECIMAL(65,30) NOT NULL,
    "totalHaberes" DECIMAL(65,30) NOT NULL,
    "totalDescuentos" DECIMAL(65,30) NOT NULL,
    "liquidoAPago" DECIMAL(65,30) NOT NULL,
    "detalleHaberes" JSONB NOT NULL,
    "detalleDescuentos" JSONB NOT NULL,
    "fondoImputacion" JSONB NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'BORRADOR',
    "fechaPago" TIMESTAMP(3),
    "archivoPDF" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoLaboral" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "tipo" "TipoContrato" NOT NULL,
    "cargo" TEXT NOT NULL,
    "funciones" TEXT,
    "horasSemanales" INTEGER NOT NULL,
    "sueldoBruto" DECIMAL(65,30) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaTermino" TIMESTAMP(3),
    "estado" "EstadoContrato" NOT NULL DEFAULT 'VIGENTE',
    "causalTermino" TEXT,
    "documento" TEXT,
    "finiquito" TEXT,
    "anexos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarcaAsistencia" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaEntrada" TIMESTAMP(3),
    "horaSalida" TIMESTAMP(3),
    "horasTrabajadas" DECIMAL(65,30),
    "horasExtra" DECIMAL(65,30),
    "atrasoMinutos" INTEGER,
    "tipoDia" "TipoDia" NOT NULL DEFAULT 'NORMAL',
    "licenciaTipo" TEXT,
    "licenciaDias" INTEGER,
    "licenciaFolio" TEXT,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarcaAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BienInventario" (
    "id" TEXT NOT NULL,
    "codigoInventario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" "CategoriaBien" NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "numeroSerie" TEXT,
    "salaId" TEXT,
    "responsableId" TEXT,
    "estado" "EstadoBien" NOT NULL DEFAULT 'BUENO',
    "valorAdquisicion" DECIMAL(65,30) NOT NULL,
    "fechaAdquisicion" TIMESTAMP(3) NOT NULL,
    "fondoCompra" TEXT,
    "numeroFactura" TEXT,
    "vidaUtilAnios" INTEGER,
    "foto" TEXT,
    "motivoBaja" TEXT,
    "fechaBaja" TIMESTAMP(3),
    "historial" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BienInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PME" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" "EstadoPME" NOT NULL DEFAULT 'BORRADOR',
    "aprobadoPor" TEXT,
    "fechaAprobacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PME_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccionPME" (
    "id" TEXT NOT NULL,
    "pmeId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "meta" TEXT,
    "indicador" TEXT,
    "descripcion" TEXT NOT NULL,
    "responsableId" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "presupuesto" DECIMAL(65,30),
    "fondoId" TEXT,
    "porcentajeAvance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "evidencias" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccionPME_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCumplimiento" (
    "id" TEXT NOT NULL,
    "area" "AreaCumplimiento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "normativaReferencia" TEXT,
    "plazoLegal" TIMESTAMP(3),
    "estado" "EstadoCumplimiento" NOT NULL DEFAULT 'PENDIENTE',
    "responsableId" TEXT,
    "documentoRespaldo" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCumplimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fiscalizacion" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "entidad" TEXT NOT NULL,
    "fiscalizador" TEXT,
    "hallazgos" TEXT,
    "compromisos" TEXT,
    "plazoSubsanacion" TIMESTAMP(3),
    "estadoSubsanacion" TEXT,
    "documentos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fiscalizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "categoria" TEXT NOT NULL,
    "recurrencia" TEXT,
    "audiencia" TEXT NOT NULL DEFAULT 'todos',
    "ubicacion" TEXT,
    "color" TEXT,
    "establecimientoId" TEXT NOT NULL,
    "creadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoAuditoria" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "datosAntes" JSONB,
    "datosDespues" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "EventoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacionArchivo" (
    "id" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "archivoUrl" TEXT,
    "totalFilas" INTEGER NOT NULL,
    "filasExitosas" INTEGER NOT NULL DEFAULT 0,
    "filasConError" INTEGER NOT NULL DEFAULT 0,
    "errores" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'PROCESANDO',
    "importadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacionArchivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidad" "SeveridadAlerta" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "moduloDestino" TEXT,
    "urlDestino" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "resueltaPor" TEXT,
    "fechaResolucion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Establecimiento_rbd_key" ON "Establecimiento"("rbd");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_run_key" ON "Usuario"("run");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_funcionarioId_key" ON "Usuario"("funcionarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_apoderadoId_key" ON "Usuario"("apoderadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Alumno_run_key" ON "Alumno"("run");

-- CreateIndex
CREATE INDEX "Alumno_cursoId_idx" ON "Alumno"("cursoId");

-- CreateIndex
CREATE INDEX "Alumno_estadoMatricula_idx" ON "Alumno"("estadoMatricula");

-- CreateIndex
CREATE INDEX "Alumno_run_idx" ON "Alumno"("run");

-- CreateIndex
CREATE UNIQUE INDEX "Apoderado_run_key" ON "Apoderado"("run");

-- CreateIndex
CREATE UNIQUE INDEX "ApoderadoAlumno_alumnoId_apoderadoId_key" ON "ApoderadoAlumno"("alumnoId", "apoderadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_run_key" ON "Funcionario"("run");

-- CreateIndex
CREATE INDEX "Funcionario_tipo_idx" ON "Funcionario"("tipo");

-- CreateIndex
CREATE INDEX "Funcionario_estado_idx" ON "Funcionario"("estado");

-- CreateIndex
CREATE INDEX "Curso_anio_idx" ON "Curso"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_nombre_anio_establecimientoId_key" ON "Curso"("nombre", "anio", "establecimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "Asignatura_codigo_key" ON "Asignatura"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AsignaturaDocente_asignaturaId_funcionarioId_cursoId_anio_key" ON "AsignaturaDocente"("asignaturaId", "funcionarioId", "cursoId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioBloque_cursoId_diaSemana_bloqueNumero_anio_key" ON "HorarioBloque"("cursoId", "diaSemana", "bloqueNumero", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioBloque_salaId_diaSemana_bloqueNumero_anio_key" ON "HorarioBloque"("salaId", "diaSemana", "bloqueNumero", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioBloque_docenteId_diaSemana_bloqueNumero_anio_key" ON "HorarioBloque"("docenteId", "diaSemana", "bloqueNumero", "anio");

-- CreateIndex
CREATE INDEX "Nota_alumnoId_asignaturaId_anio_semestre_idx" ON "Nota"("alumnoId", "asignaturaId", "anio", "semestre");

-- CreateIndex
CREATE INDEX "Asistencia_cursoId_fecha_idx" ON "Asistencia"("cursoId", "fecha");

-- CreateIndex
CREATE INDEX "Asistencia_alumnoId_fecha_idx" ON "Asistencia"("alumnoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Asistencia_alumnoId_fecha_tramoHorario_key" ON "Asistencia"("alumnoId", "fecha", "tramoHorario");

-- CreateIndex
CREATE INDEX "Atraso_alumnoId_fecha_idx" ON "Atraso"("alumnoId", "fecha");

-- CreateIndex
CREATE INDEX "Anotacion_alumnoId_idx" ON "Anotacion"("alumnoId");

-- CreateIndex
CREATE INDEX "Anotacion_tipo_fecha_idx" ON "Anotacion"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "Leccionario_docenteId_fecha_idx" ON "Leccionario"("docenteId", "fecha");

-- CreateIndex
CREATE INDEX "Leccionario_cursoId_fecha_idx" ON "Leccionario"("cursoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "FichaNEE_alumnoId_key" ON "FichaNEE"("alumnoId");

-- CreateIndex
CREATE UNIQUE INDEX "Fondo_nombre_anio_establecimientoId_key" ON "Fondo"("nombre", "anio", "establecimientoId");

-- CreateIndex
CREATE INDEX "MovimientoFinanciero_fondoId_anio_mes_idx" ON "MovimientoFinanciero"("fondoId", "anio", "mes");

-- CreateIndex
CREATE INDEX "MovimientoFinanciero_tipo_anio_mes_idx" ON "MovimientoFinanciero"("tipo", "anio", "mes");

-- CreateIndex
CREATE INDEX "Pago_alumnoId_estado_idx" ON "Pago"("alumnoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_anio_key" ON "Presupuesto"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_rut_key" ON "Proveedor"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "Liquidacion_funcionarioId_mes_anio_key" ON "Liquidacion"("funcionarioId", "mes", "anio");

-- CreateIndex
CREATE INDEX "MarcaAsistencia_funcionarioId_fecha_idx" ON "MarcaAsistencia"("funcionarioId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "MarcaAsistencia_funcionarioId_fecha_key" ON "MarcaAsistencia"("funcionarioId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "BienInventario_codigoInventario_key" ON "BienInventario"("codigoInventario");

-- CreateIndex
CREATE INDEX "BienInventario_categoria_idx" ON "BienInventario"("categoria");

-- CreateIndex
CREATE INDEX "BienInventario_estado_idx" ON "BienInventario"("estado");

-- CreateIndex
CREATE INDEX "BienInventario_salaId_idx" ON "BienInventario"("salaId");

-- CreateIndex
CREATE UNIQUE INDEX "PME_anio_key" ON "PME"("anio");

-- CreateIndex
CREATE INDEX "EventoAuditoria_entidad_entidadId_idx" ON "EventoAuditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_usuarioId_idx" ON "EventoAuditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_timestamp_idx" ON "EventoAuditoria"("timestamp");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_apoderadoId_fkey" FOREIGN KEY ("apoderadoId") REFERENCES "Apoderado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sala" ADD CONSTRAINT "Sala_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumno" ADD CONSTRAINT "Alumno_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApoderadoAlumno" ADD CONSTRAINT "ApoderadoAlumno_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApoderadoAlumno" ADD CONSTRAINT "ApoderadoAlumno_apoderadoId_fkey" FOREIGN KEY ("apoderadoId") REFERENCES "Apoderado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_docenteJefeId_fkey" FOREIGN KEY ("docenteJefeId") REFERENCES "Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignaturaDocente" ADD CONSTRAINT "AsignaturaDocente_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignaturaDocente" ADD CONSTRAINT "AsignaturaDocente_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioBloque" ADD CONSTRAINT "HorarioBloque_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioBloque" ADD CONSTRAINT "HorarioBloque_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atraso" ADD CONSTRAINT "Atraso_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacion" ADD CONSTRAINT "Anotacion_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leccionario" ADD CONSTRAINT "Leccionario_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaNEE" ADD CONSTRAINT "FichaNEE_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fondo" ADD CONSTRAINT "Fondo_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoFinanciero" ADD CONSTRAINT "MovimientoFinanciero_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "Fondo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rendicion" ADD CONSTRAINT "Rendicion_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "Fondo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoLinea" ADD CONSTRAINT "PresupuestoLinea_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoLinea" ADD CONSTRAINT "PresupuestoLinea_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "Fondo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoProveedor" ADD CONSTRAINT "ContratoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liquidacion" ADD CONSTRAINT "Liquidacion_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoLaboral" ADD CONSTRAINT "ContratoLaboral_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarcaAsistencia" ADD CONSTRAINT "MarcaAsistencia_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BienInventario" ADD CONSTRAINT "BienInventario_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BienInventario" ADD CONSTRAINT "BienInventario_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccionPME" ADD CONSTRAINT "AccionPME_pmeId_fkey" FOREIGN KEY ("pmeId") REFERENCES "PME"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
