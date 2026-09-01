import React from 'react';
import './ui.css';

function LoadingPanel({ children = 'Loading…' }) {
  return (
    <div className="ui-loading-panel" role="status" aria-live="polite">
      <span className="ui-spinner" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export default LoadingPanel;
