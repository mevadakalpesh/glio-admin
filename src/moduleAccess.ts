import {modules} from './modules';
// Navigation convenience only. Every API still enforces its own permission checks.
export function accessibleModules(permissions: readonly string[]) {
  return modules.filter(module => module.id === 'sessions' || module.permissions.some(permission => permissions.includes(permission)));
}
