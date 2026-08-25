export const MANAGEMENT_ROLES = ['admin', 'board'];

export interface RoleUserLike {
  role?: string;
  [key: string]: any;
}

/**
 * Retorna se a role informada faz parte da gestão / diretoria
 */
export function isManagementRole(role?: string): boolean {
  if (!role) return false;
  return MANAGEMENT_ROLES.includes(role.toLowerCase());
}

/**
 * Retorna se o usuário logado tem permissão para visualizar dados financeiros,
 * faturamento, valores de contratos e serviços.
 */
export function canViewFinancials(user: RoleUserLike | null): boolean {
  if (!user) return false;
  if (isManagementRole(user.role)) return true;
  return false;
}

/**
 * Retorna se o usuário pode gerenciar equipe e cargos
 */
export function canManageTeam(user: RoleUserLike | null): boolean {
  if (!user) return false;
  return isManagementRole(user.role);
}

/**
 * Retorna se o usuário pode gerenciar serviços e cadastros gerais
 */
export function canManageServices(user: RoleUserLike | null): boolean {
  if (!user) return false;
  return isManagementRole(user.role);
}
