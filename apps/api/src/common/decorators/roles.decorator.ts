import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@quiz/contracts';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
