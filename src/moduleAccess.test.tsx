import {expect, test} from 'vitest';
import {accessibleModules} from './moduleAccess';
const ids = (permissions: string[]) => accessibleModules(permissions).map(module => module.id);
test('operations navigation excludes finance and owner administration', () => {
  expect(ids(['journeys.read', 'tracking.live.read', 'tracking.evidence.read'])).toEqual(['trips', 'tracking', 'sessions']);
});
test('verification navigation keeps journey evidence and account security', () => {
  expect(ids(['journeys.read', 'verification.read', 'verification.evidence.read', 'verification.decide'])).toEqual(['trips', 'verification', 'sessions']);
});
test('finance and support get only granted modules', () => {
  expect(ids(['journeys.read', 'payments.read', 'cases.read'])).toEqual(['trips', 'support', 'payments', 'sessions']);
  expect(ids(['journeys.read', 'cases.read'])).toEqual(['trips', 'support', 'sessions']);
});
test('account security remains available without business permissions', () => {
  expect(ids([])).toEqual(['sessions']);
  expect(ids(['unknown.permission'])).toEqual(['sessions']);
});
