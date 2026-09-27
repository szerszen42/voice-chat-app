import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-dark-900 flex items-center justify-center p-6 text-center select-none text-dark-200">
          <div className="max-w-md w-full bg-dark-800 border border-dark-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4 text-2xl font-black">
              !
            </div>
            <h2 className="text-base font-bold text-white mb-1">Coś poszło nie tak</h2>
            <p className="text-xs text-dark-400 mb-5 leading-relaxed">
              Wystąpił drobny błąd podczas przełączania widoku. Kliknij poniższy przycisk, aby natychmiast powrócić do czatu.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Odśwież aplikację
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
