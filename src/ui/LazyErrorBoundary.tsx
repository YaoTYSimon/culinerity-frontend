import { Component, createRef, type ReactNode } from 'react';
import { retryFailedLoads } from './lazyWithRetry';
import { PillButton } from './PillButton';

interface Props {
  children: ReactNode;
  /** When this changes (the current view), a shown error is cleared. */
  resetKey: string;
}

/**
 * Catches a view's code chunk failing to load (offline after a deploy) so the rest of the page stays up.
 * Plain text in the plate style, nothing about the error is logged or sent anywhere.
 */
export class LazyErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  private message = createRef<HTMLParagraphElement>();

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: Props, prevState: { failed: boolean }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
    else if (this.state.failed && !prevState.failed) this.message.current?.focus();
  }

  private retry = () => {
    retryFailedLoads();
    this.setState({ failed: false });
  };

  componentDidCatch() {
    // Nothing to log: the message is the whole response.
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] justify-items-start gap-3">
        <p ref={this.message} role="alert" tabIndex={-1} data-lazy-error className="text-base text-pretty outline-none">
          This part did not load. Check your connection and try again.
        </p>
        <PillButton variant="surface" onClick={this.retry}>
          Try again
        </PillButton>
      </div>
    );
  }
}
