import { usePermissionsStore } from '../stores/permissionsStore';

/** Returns true if the current admin has the given RBAC permission.
 *  When the permissions list is empty (not yet loaded, or super_admin fallback), returns true. */
export function usePermission(key: string): boolean {
  const { permissions, loaded } = usePermissionsStore((s) => ({ permissions: s.permissions, loaded: s.loaded }));
  if (!loaded || permissions.length === 0) return true; // default-allow while loading or for super_admin
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
