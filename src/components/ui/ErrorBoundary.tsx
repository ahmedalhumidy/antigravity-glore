import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
    level?: 'app' | 'page' | 'section';
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        this.props.onReset?.();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { level = 'page' } = this.props;
            const isApp = level === 'app';
            const isSection = level === 'section';

            return (
                <div
                    className={`flex items-center justify-center ${isApp ? 'min-h-screen' : isSection ? 'py-8' : 'py-16'
                        } px-4`}
                >
                    <div className="w-full max-w-md text-center">
                        {/* Animated error icon */}
                        <div className="relative mx-auto mb-6 w-20 h-20">
                            <div className="absolute inset-0 rounded-2xl bg-destructive/10 animate-pulse" />
                            <div className="relative flex items-center justify-center w-full h-full rounded-2xl bg-destructive/5 border border-destructive/20 backdrop-blur-sm">
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-foreground mb-2">
                            Bir şeyler yanlış gitti
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya
                            sorun devam ederse yöneticinizle iletişime geçin.
                        </p>

                        {/* Error details (dev mode only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                                    Hata detayları (geliştirici)
                                </summary>
                                <pre className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-destructive overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                    {this.state.error.message}
                                    {this.state.errorInfo?.componentStack && (
                                        <>
                                            {'\n\n'}Stack:{'\n'}
                                            {this.state.errorInfo.componentStack}
                                        </>
                                    )}
                                </pre>
                            </details>
                        )}

                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleReset}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tekrar Dene
                            </button>
                            {isApp && (
                                <button
                                    onClick={this.handleGoHome}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted/50 transition-all duration-200"
                                >
                                    <Home className="w-4 h-4" />
                                    Ana Sayfa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
