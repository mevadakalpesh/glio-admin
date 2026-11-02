import {afterEach, expect, test, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {lazy, Suspense} from 'react';
import {WorkspaceErrorBoundary} from './WorkspaceErrorBoundary';
afterEach(() => {cleanup(); vi.restoreAllMocks();});
function Broken(): never {throw new Error('private response details');}
test('render failure preserves a useful recovery screen without leaking errors or auto retry', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const reload = vi.fn();
  render(<><nav>Other modules</nav><WorkspaceErrorBoundary onReload={reload}><Broken/></WorkspaceErrorBoundary></>);
  expect(screen.getByRole('alert').textContent).toContain('check its recorded status');
  expect(screen.queryByText('private response details')).toBeNull();
  expect(screen.getByRole('navigation').textContent).toContain('Other modules');
  expect(reload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Reload Gilo Admin'}));
  expect(reload).toHaveBeenCalledTimes(1);
});
test('rejected lazy module shows recovery rather than a blank page', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Module = lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
  render(<WorkspaceErrorBoundary><Suspense fallback={<p>Loading</p>}><Module/></Suspense></WorkspaceErrorBoundary>);
  expect((await screen.findByRole('alert')).textContent).toContain('could not be displayed');
});
test('moving to a different module resets the boundary', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const view = render(<WorkspaceErrorBoundary key="trips"><Broken/></WorkspaceErrorBoundary>);
  expect(screen.getByRole('alert')).toBeTruthy();
  view.rerender(<WorkspaceErrorBoundary key="overview"><h1>Overview</h1></WorkspaceErrorBoundary>);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('heading').textContent).toBe('Overview');
});
