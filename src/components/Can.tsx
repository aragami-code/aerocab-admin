import { usePermissionsStore } from '../stores/permissionsStore';

/** Returns true if the current admin has the given RBAC permission.
 *  Deny-by-default: while loading, on error, or if the permission is simply
 *  absent from the effective list, access is denied. A super_admin has every
 *  key explicitly present in `permissions` (the backend grants all keys to
 *  that role), so there is no "empty array = full access" special case. */
export function usePermission(key: string): boolean {
  const { permissions, status } = usePermissionsStore((s) => ({ permissions: s.permissions, status: s.status }));
  if (status !== 'loaded') return false;
  return permissions.includes(key);
}

/** Render children only when the admin has the given RBAC permission. */
export function Can({ permission, children, fallback }: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const has = usePermission(permission);
  return has ? <>{children}</> : <>{fallback ?? null}</>;
}
