'use client';

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 bg-danger-400/10 border border-danger-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-danger-400 text-xl font-black">!</span>
                        </div>
                        <p className="text-[15px] font-black text-white mb-1.5 tracking-wide">
                            Something went wrong
                        </p>
                        <p className="text-small text-neutral-500 font-medium mb-4">
                            {this.state.error?.message}
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: undefined })}
                            className="px-5 py-2.5 rounded-xl bg-white/6 border border-white/10 text-neutral-300 font-bold text-small hover:bg-white/10 transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                )
            );
        }
        return this.props.children;
    }
}
