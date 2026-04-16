import { SetMetadata } from '@nestjs/common';
import { Permission } from '@flowmind/shared';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
