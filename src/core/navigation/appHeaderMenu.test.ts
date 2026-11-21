import { describe, expect, it } from 'vitest';
import { getAppHeaderMenuActions } from './appHeaderMenuModel';

describe('app header menu actions', () => {
  it('shows Settings and sign out to owners', () => {
    expect(getAppHeaderMenuActions('owner')).toEqual(['settings', 'signOut']);
  });

  it('keeps Settings hidden from staff and users without a role', () => {
    expect(getAppHeaderMenuActions('staff')).toEqual(['signOut']);
    expect(getAppHeaderMenuActions(null)).toEqual(['signOut']);
  });
});
