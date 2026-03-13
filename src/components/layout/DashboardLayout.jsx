'use client';

import React from 'react';

// Simplified DashboardLayout - legacy wrapper for payment pages
// The main dashboard layout is handled by dashboard/layout.tsx -> ResponsiveLayout
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-full p-6 mx-auto">
        <div className="min-h-full p-6 bg-white rounded-lg shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
} 
