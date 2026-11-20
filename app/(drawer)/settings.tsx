import { OwnerOnlyRoute } from '../../src/core/auth/AuthGate';
import { SettingsScreen } from '../../src/features/access-management/presentation/SettingsScreen';

export default function SettingsRoute() {
  return (
    <OwnerOnlyRoute>
      <SettingsScreen />
    </OwnerOnlyRoute>
  );
}
