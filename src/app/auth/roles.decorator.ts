import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Usage:
 * @Roles('ADMIN')
 * @Roles('COURSE_PROVIDER')
 */
export const Roles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
