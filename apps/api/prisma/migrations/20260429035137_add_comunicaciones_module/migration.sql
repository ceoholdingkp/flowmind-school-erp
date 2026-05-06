-- CreateTable
CREATE TABLE "comunicado" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'NORMAL',
    "destinatarios" TEXT NOT NULL,
    "cursoId" TEXT,
    "enviadoPor" TEXT NOT NULL,
    "fechaEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaExpiracion" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'ENVIADO',
    "adjuntoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lectura_comunicado" (
    "id" TEXT NOT NULL,
    "comunicadoId" TEXT NOT NULL,
    "apoderadoId" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fechaLectura" TIMESTAMP(3),
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "fechaConfirmacion" TIMESTAMP(3),

    CONSTRAINT "lectura_comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensaje_individual" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "remitente" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fechaLectura" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensaje_individual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comunicado_fechaEnvio_idx" ON "comunicado"("fechaEnvio");

-- CreateIndex
CREATE INDEX "comunicado_tipo_estado_idx" ON "comunicado"("tipo", "estado");

-- CreateIndex
CREATE INDEX "lectura_comunicado_apoderadoId_idx" ON "lectura_comunicado"("apoderadoId");

-- CreateIndex
CREATE UNIQUE INDEX "lectura_comunicado_comunicadoId_apoderadoId_key" ON "lectura_comunicado"("comunicadoId", "apoderadoId");

-- CreateIndex
CREATE INDEX "mensaje_individual_alumnoId_idx" ON "mensaje_individual"("alumnoId");

-- CreateIndex
CREATE INDEX "mensaje_individual_destinatarioId_idx" ON "mensaje_individual"("destinatarioId");

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectura_comunicado" ADD CONSTRAINT "lectura_comunicado_comunicadoId_fkey" FOREIGN KEY ("comunicadoId") REFERENCES "comunicado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectura_comunicado" ADD CONSTRAINT "lectura_comunicado_apoderadoId_fkey" FOREIGN KEY ("apoderadoId") REFERENCES "Apoderado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_individual" ADD CONSTRAINT "mensaje_individual_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
