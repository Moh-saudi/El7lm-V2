'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface LayoutContextType {
    // Sidebar state
    isSidebarOpen: boolean;
    isSidebarCollapsed: boolean;

    // Responsive breakpoints
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;

    // Client-side rendering flag
    isClient: boolean;

    // Actions
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
    collapseSidebar: () => void;
    expandSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};

interface LayoutProviderProps {
    children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
    // Client-side rendering detection
    const [isClient, setIsClient] = useState(false);

    // Sidebar states
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Responsive breakpoints
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
    const isDesktop = useMediaQuery('(min-width: 1025px)');

    // Mark as client-side after mount
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Actions
    const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setIsSidebarOpen(prev => !prev);
        } else {
            setIsSidebarCollapsed(prev => !prev);
        }
    }, [isMobile]);
    const collapseSidebar = useCallback(() => setIsSidebarCollapsed(true), []);
    const expandSidebar = useCallback(() => setIsSidebarCollapsed(false), []);

    const value: LayoutContextType = {
        isSidebarOpen,
        isSidebarCollapsed,
        isMobile,
        isTablet,
        isDesktop,
        isClient,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
    };

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};

export default LayoutProvider;
