-- CreateTable
CREATE TABLE "liquidacion_sueldo" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "diasTrabajados" INTEGER NOT NULL DEFAULT 30,
    "sueldoBase" DECIMAL(65,30) NOT NULL,
    "asignacionFamiliar" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bonoZona" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "horasExtra" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otrosHaberes" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalHaberes" DECIMAL(65,30) NOT NULL,
    "afp" TEXT NOT NULL,
    "tasaAfp" DECIMAL(65,30) NOT NULL,
    "montoAfp" DECIMAL(65,30) NOT NULL,
    "salud" TEXT NOT NULL,
    "montoSalud" DECIMAL(65,30) NOT NULL,
    "seguroCesantia" DECIMAL(65,30) NOT NULL,
    "impuestoUnico" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otrosDescuentos" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDescuentos" DECIMAL(65,30) NOT NULL,
    "sueldoLiquido" DECIMAL(65,30) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidacion_sueldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_previsional" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tasa" DECIMAL(65,30) NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "configuracion_previsional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "liquidacion_sueldo_mes_anio_idx" ON "liquidacion_sueldo"("mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "liquidacion_sueldo_funcionarioId_mes_anio_key" ON "liquidacion_sueldo"("funcionarioId", "mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_previsional_nombre_key" ON "configuracion_previsional"("nombre");

-- AddForeignKey
ALTER TABLE "liquidacion_sueldo" ADD CONSTRAINT "liquidacion_sueldo_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
