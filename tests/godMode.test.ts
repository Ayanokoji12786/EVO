import { afterEach, expect, it } from 'vitest';
import { useSimStore } from '../src/state/simStore';

afterEach(() => useSimStore.getState().setGodMode(false));

it('disarms a persistent weather brush when God Mode is disabled', () => {
  const store = useSimStore.getState();
  store.setGodMode(true);
  store.setPendingGodAction({ kind: 'rainfall', radius: 90, intensity: 0.7, duration: 600 });
  store.setGodMode(false);
  expect(useSimStore.getState().pendingGodAction).toBeNull();
  store.setGodMode(true);
  expect(useSimStore.getState().pendingGodAction).toBeNull();
});
