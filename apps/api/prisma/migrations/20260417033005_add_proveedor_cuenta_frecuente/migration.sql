-- CreateTable
CREATE TABLE "proveedor_cuenta_frecuente" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "cuentaCodigo" TEXT NOT NULL,
    "frecuencia" INTEGER NOT NULL DEFAULT 1,
    "ultimoUso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedor_cuenta_frecuente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_cuenta_frecuente_proveedorId_cuentaCodigo_key" ON "proveedor_cuenta_frecuente"("proveedorId", "cuentaCodigo");

-- AddForeignKey
ALTER TABLE "proveedor_cuenta_frecuente" ADD CONSTRAINT "proveedor_cuenta_frecuente_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_cuenta_frecuente" ADD CONSTRAINT "proveedor_cuenta_frecuente_cuentaCodigo_fkey" FOREIGN KEY ("cuentaCodigo") REFERENCES "supereduc_cuenta"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
