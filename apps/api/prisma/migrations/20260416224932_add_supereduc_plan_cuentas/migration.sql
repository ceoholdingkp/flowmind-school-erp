-- AlterTable
ALTER TABLE "MovimientoFinanciero" ADD COLUMN     "supereducCuentaCodigo" TEXT;

-- CreateTable
CREATE TABLE "supereduc_cuenta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "esAgrupadora" BOOLEAN NOT NULL DEFAULT false,
    "codigoPadre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supereduc_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supereduc_cuenta_subvencion" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "subvencion" TEXT NOT NULL,

    CONSTRAINT "supereduc_cuenta_subvencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supereduc_cuenta_documento" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "tipoDoc" TEXT NOT NULL,

    CONSTRAINT "supereduc_cuenta_documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supereduc_cuenta_codigo_key" ON "supereduc_cuenta"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "supereduc_cuenta_subvencion_cuentaId_subvencion_key" ON "supereduc_cuenta_subvencion"("cuentaId", "subvencion");

-- CreateIndex
CREATE UNIQUE INDEX "supereduc_cuenta_documento_cuentaId_tipoDoc_key" ON "supereduc_cuenta_documento"("cuentaId", "tipoDoc");

-- AddForeignKey
ALTER TABLE "MovimientoFinanciero" ADD CONSTRAINT "MovimientoFinanciero_supereducCuentaCodigo_fkey" FOREIGN KEY ("supereducCuentaCodigo") REFERENCES "supereduc_cuenta"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supereduc_cuenta" ADD CONSTRAINT "supereduc_cuenta_codigoPadre_fkey" FOREIGN KEY ("codigoPadre") REFERENCES "supereduc_cuenta"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supereduc_cuenta_subvencion" ADD CONSTRAINT "supereduc_cuenta_subvencion_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "supereduc_cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supereduc_cuenta_documento" ADD CONSTRAINT "supereduc_cuenta_documento_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "supereduc_cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
