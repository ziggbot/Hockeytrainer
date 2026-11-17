import { Component, type ErrorInfo, type ReactNode } from "react";
import { S } from "../i18n";

interface Props {
  onReset: () => void;
  children: ReactNode;
}

/**
 * Without this, a render error unmounts the whole app and leaves a blank,
 * frozen-looking screen. Show what broke and a way back instead.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="page page--bare">
        <h1 className="title">{S.ui.error.title}</h1>
        <p className="sub">{S.ui.error.body}</p>
        <pre className="box" style={{ whiteSpace: "pre-wrap", fontSize: 14, overflowX: "auto" }}>
          {error.name}: {error.message}
        </pre>
        <button
          type="button"
          className="cta cta--small"
          onClick={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
        >
          {S.ui.error.home}
        </button>
      </main>
    );
  }
}
