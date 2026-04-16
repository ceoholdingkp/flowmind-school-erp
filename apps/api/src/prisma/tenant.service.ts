import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * TenantService - Multi-tenant PrismaClient manager
 *
 * Diseño:
 * - Singleton (Scope.DEFAULT)
 * - Cache de clients por tenantId (Map)
 * - Contexto del request via AsyncLocalStorage (no necesita pasar tenantId manualmente)
 * - Cleanup automático en OnModuleDestroy
 *
 * Fix de bug previo: la versión anterior creaba un new PrismaClient() por
 * request sin cerrarlo, saturando el pool de conexiones de Postgres.
 */
@Injectable()
export class TenantService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantService.name);
  private readonly clients = new Map<string, PrismaClient>();
  private readonly als = new AsyncLocalStorage<{ tenantId: string }>();

  /**
   * Ejecuta una función dentro del contexto de un tenant.
   * Lo llama el TenantMiddleware en cada request.
   */
  runWithTenant<T>(tenantId: string, callback: () => T): T {
    return this.als.run({ tenantId }, callback);
  }

  /**
   * Retorna el PrismaClient del tenant actual.
   * Si no existe en cache, lo crea una sola vez y lo guarda.
   */
  getClient(): PrismaClient {
    const context = this.als.getStore();
    if (!context?.tenantId) {
      throw new Error(
        'TenantService.getClient() llamado fuera de contexto de tenant. ' +
        'Asegurate de que el TenantMiddleware este activo.',
      );
    }

    const { tenantId } = context;
    let client = this.clients.get(tenantId);

    if (!client) {
      const databaseUrl = this.buildTenantUrl(tenantId);
      client = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      this.clients.set(tenantId, client);
      this.logger.log(`PrismaClient creado para tenant: ${tenantId}`);
    }

    return client;
  }

  /**
   * Retorna el tenantId del contexto actual (para audit logs, etc.).
   */
  getTenantId(): string | null {
    const context = this.als.getStore();
    return context?.tenantId ?? null;
  }

  /**
   * Construye la URL de conexión para un tenant específico.
   * Lee TENANT_DATABASE_URL del env y reemplaza el placeholder.
   */
  private buildTenantUrl(tenantId: string): string {
    const template = process.env.TENANT_DATABASE_URL;
    if (!template) {
      throw new Error('TENANT_DATABASE_URL no esta definido en el env');
    }
    // El template debe contener {tenantId} como placeholder
    // Ejemplo: postgresql://user:pass@localhost:5434/{tenantId}
    return template.replace('{tenantId}', tenantId);
  }

  /**
   * Cleanup: cierra todas las conexiones Prisma al apagar la app.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(`Cerrando ${this.clients.size} PrismaClient(s)...`);
    await Promise.all(
      Array.from(this.clients.values()).map((client) =>
        client.$disconnect().catch((err) =>
          this.logger.error('Error cerrando PrismaClient', err),
        ),
      ),
    );
    this.clients.clear();
  }
}
