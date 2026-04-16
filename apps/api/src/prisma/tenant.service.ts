import { Injectable, Scope } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  private client: PrismaClient | null = null;
  private tenantId: string | null = null;

  setTenantId(tenantId: string) {
    this.tenantId = tenantId;
    const dbName = `tenant_${tenantId}`;
    const baseUrl = process.env.DATABASE_URL || '';
    const tenantUrl = baseUrl.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
    this.client = new PrismaClient({ datasources: { db: { url: tenantUrl } } });
  }

  getClient(): PrismaClient {
    if (!this.client) {
      // fallback to TENANT_DATABASE_URL for dev
      const url = process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL || '';
      this.client = new PrismaClient({ datasources: { db: { url } } });
    }
    return this.client;
  }

  getTenantId(): string | null {
    return this.tenantId;
  }
}
