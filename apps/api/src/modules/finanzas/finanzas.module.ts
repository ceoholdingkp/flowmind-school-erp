import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

// Sub-modules
import { RendicionSupereducModule } from './rendicion/rendicion.module';

// Services
import { FondosService } from './fondos.service';
import { MovimientosService } from './movimientos.service';
import { PresupuestoService } from './presupuesto.service';
import { ConciliacionService } from './conciliacion.service';
import { RendicionService } from './rendicion.service';
import { ProveedoresService } from './proveedores.service';
import { PagosService } from './pagos.service';
import { FinanzasListener } from './finanzas.listener';

// Controllers
import { FondosController } from './controllers/fondos.controller';
import { MovimientosController, EERController } from './controllers/movimientos.controller';
import { PresupuestoController } from './controllers/presupuesto.controller';
import { ConciliacionController } from './controllers/conciliacion.controller';
import { RendicionController } from './controllers/rendicion.controller';
import { ProveedoresController } from './controllers/proveedores.controller';
import { PagosController } from './controllers/pagos.controller';

@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }), // 10MB limit
    RendicionSupereducModule,
  ],
  controllers: [
    FondosController,
    MovimientosController,
    EERController,
    PresupuestoController,
    ConciliacionController,
    RendicionController,
    ProveedoresController,
    PagosController,
  ],
  providers: [
    FondosService,
    MovimientosService,
    PresupuestoService,
    ConciliacionService,
    RendicionService,
    ProveedoresService,
    PagosService,
    FinanzasListener,
  ],
})
export class FinanzasModule {}
