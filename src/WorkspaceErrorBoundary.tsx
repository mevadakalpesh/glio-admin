import {Component, type ReactNode} from 'react';
import {Button} from '@/components/ui/button';

type Props = {children: ReactNode; onReload?: () => void};
export class WorkspaceErrorBoundary extends Component<Props, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {
    if (!this.state.failed) return this.props.children;
    return <section role="alert" className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <h1 className="text-xl font-semibold">This workspace could not be displayed</h1>
      <p className="text-sm text-slate-600">Reload Gilo Admin or choose another module from the navigation.</p>
      <p className="text-sm text-slate-600">If you were submitting an action, check its recorded status before trying again. Unsaved form entries will be lost when you reload.</p>
      <Button onClick={() => this.props.onReload ? this.props.onReload() : window.location.reload()}>Reload Gilo Admin</Button>
    </section>;
  }
}
