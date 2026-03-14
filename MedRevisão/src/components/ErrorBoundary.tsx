import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      
      try {
        // Check if it's a Firestore JSON error as per guidelines
        const firestoreError = JSON.parse(this.state.error?.message || '{}');
        if (firestoreError.error && firestoreError.operationType) {
          errorMessage = `Erro de permissão no banco de dados (${firestoreError.operationType}). Por favor, contate o suporte.`;
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <h2 className="font-serif italic text-2xl mb-4">Ops! Algo deu errado.</h2>
            <p className="font-sans text-sm text-[#141414]/70 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#141414] text-[#E4E3E0] py-3 font-mono text-xs hover:bg-[#141414]/90 transition-colors"
            >
              RECARREGAR PÁGINA
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
