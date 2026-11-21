import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('UI error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="wrap main" role="alert">
        <h1>Something went wrong</h1>
        <p>The page hit an error. Reloading usually fixes it.</p>
        <button className="btn" onClick={() => window.location.reload()}>Reload</button>
      </main>
    );
  }
}
