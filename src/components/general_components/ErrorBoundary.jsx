import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("App error boundary:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    try { window.location.reload(); } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="container pt-60 pb-60" role="alert" aria-live="assertive">
          <h2>Something went wrong</h2>
          <p className="mt-10">We hit an unexpected error. Please try again.</p>
          <button className="butn mt-10" onClick={this.handleRetry}>Reload</button>
        </section>
      );
    }
    return this.props.children;
  }
}

