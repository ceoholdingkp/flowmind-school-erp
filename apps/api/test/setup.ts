process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5434/test';
process.env.TENANT_DATABASE_URL = 'postgresql://test:test@localhost:5434/tenant_{tenantId}';
process.env.NODE_ENV = 'test';
