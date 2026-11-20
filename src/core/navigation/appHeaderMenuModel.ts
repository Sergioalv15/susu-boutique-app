import { BusinessRole, canAccessOwnerSections } from '../auth/businessRole';

export type AppHeaderMenuAction = 'settings' | 'signOut';

export function getAppHeaderMenuActions(role: BusinessRole | null): AppHeaderMenuAction[] {
  return canAccessOwnerSections(role) ? ['settings', 'signOut'] : ['signOut'];
}
