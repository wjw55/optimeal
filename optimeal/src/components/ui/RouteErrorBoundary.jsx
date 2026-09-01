import React, { Component } from 'react';
import './ui.css';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Optimeal route error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="ui-route-error" role="alert">
        <p className="ui-route-error__eyebrow">Something went wrong</p>
        <h1>This page could not be loaded.</h1>
        <p>Your saved data has not been changed. Reload the page, or return home and try again.</p>
        <div>
          <button className="ui-button ui-button--primary" type="button" onClick={() => window.location.reload()}>Reload page</button>
          <a className="ui-button ui-button--secondary" href="/">Return home</a>
        </div>
      </main>
    );
  }
}

export default RouteErrorBoundary;
