'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    // تجاهل أخطاء URLs العربية و JSON parsing و Syntax errors
    if (
      error.message.includes('Invalid URL with Arabic text') ||
      error.message.includes('%D8%') ||
      error.message.includes('Failed to execute \'json\' on \'Response\'') ||
      error.message.includes('Unexpected end of JSON input') ||
      error.message.includes('Invalid or unexpected token') ||
      error.message.includes('SyntaxError') ||
      error.stack?.includes('url-validator') ||
      error.stack?.includes('Preview.js') ||
      error.stack?.includes('layout.js') ||
      error.stack?.includes('client-layout.tsx')
    ) {
      console.debug('🚫 تم تجاهل خطأ في AppErrorBoundary:', error.message);
      return { hasError: false };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // تسجيل الأخطاء المهمة فقط
    if (
      !error.message.includes('Invalid URL with Arabic text') &&
      !error.message.includes('%D8%') &&
      !error.message.includes('Failed to execute \'json\' on \'Response\'') &&
      !error.message.includes('Unexpected end of JSON input') &&
      !error.message.includes('Invalid or unexpected token') &&
      !error.message.includes('SyntaxError') &&
      !error.stack?.includes('url-validator') &&
      !error.stack?.includes('Preview.js') &&
      !error.stack?.includes('layout.js') &&
      !error.stack?.includes('client-layout.tsx')
    ) {
      console.error('Critical error caught by AppErrorBoundary:', error, errorInfo);
    }
  }

  handleReload = () => {
    // إعادة تحميل الصفحة بطريقة آمنة
    if (typeof window !== 'undefined') {
      window.location.href = window.location.href;
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-red-50">
            <div className="max-w-md w-full text-center p-8">
              {/* شعاع خلفي */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 via-pink-400/20 to-red-400/20 blur-3xl opacity-30 animate-pulse"></div>

              <div className="relative z-10">
                {/* أيقونة الخطأ */}
                <div className="mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <AlertTriangle className="w-12 h-12 text-white" />
                  </div>
                  <div className="w-16 h-1 bg-red-500 rounded mx-auto opacity-80"></div>
                </div>

                {/* المحتوى الرئيسي */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                  <h1 className="text-2xl font-bold text-gray-800 mb-3">
                    حدث خطأ غير متوقع
                  </h1>

                  <p className="text-gray-600 mb-6 leading-relaxed">
                    نعتذر، حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
                  </p>

                  {/* معلومات تقنية (في بيئة التطوير فقط) */}
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <div className="bg-red-50 rounded-lg p-4 mb-6 text-right">
                      <h3 className="font-semibold text-red-800 mb-2">معلومات تقنية:</h3>
                      <p className="text-sm text-red-700 font-mono">
                        {this.state.error.message}
                      </p>
                    </div>
                  )}

                  {/* الأزرار */}
                  <div className="space-y-3">
                    <Button
                      onClick={this.handleReload}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      إعادة تحميل الصفحة
                    </Button>

                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                    >
                      <Home className="w-4 h-4" />
                      العودة للرئيسية
                    </Button>
                  </div>
                </div>

                {/* معلومات إضافية */}
                <div className="text-sm text-gray-500">
                  <p>إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني</p>
                  <p>support@el7lm.com</p>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
