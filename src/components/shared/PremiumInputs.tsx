'use client';

import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export const FloatingInput = ({ label, icon: Icon, error, id, className = '', ...props }: any) => (
    <div className="relative w-full">
        <input
            id={id}
            {...props}
            className={`block w-full h-[60px] px-4 pb-2 pt-6 text-sm text-slate-800 bg-slate-50/50 border rounded-2xl appearance-none focus:outline-none focus:ring-0 peer transition-all ${error ? 'border-red-400 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-purple-600 focus:bg-white'} ${Icon ? 'pr-12' : 'pr-4'} ${className}`}
            placeholder=" "
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
        />
        <label
            htmlFor={id}
            className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-5 z-10 origin-[top_right] pointer-events-none transition-all peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-purple-600 ${Icon ? 'right-12' : 'right-4'} ${error ? 'text-red-500' : 'text-slate-400'}`}
        >
            {label}
        </label>
        {Icon && (
            <Icon
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-20 pointer-events-none ${error ? 'text-red-400' : 'text-slate-400 peer-focus:text-purple-600'}`}
                aria-hidden="true"
            />
        )}
        {error && (
            <div
                id={`${id}-error`}
                className="flex items-start gap-2 mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 animate-in slide-in-from-top-1 duration-200"
                role="alert"
            >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
            </div>
        )}
    </div>
);

export const FloatingSelect = ({ label, icon: Icon, error, id, children, className = '', ...props }: any) => (
    <div className="relative w-full">
        <select
            id={id}
            {...props}
            className={`block w-full h-[60px] pr-12 pl-10 pb-2 pt-6 text-sm font-black text-slate-800 bg-slate-50/50 border rounded-2xl appearance-none focus:outline-none focus:ring-0 peer transition-all cursor-pointer ${error ? 'border-red-400 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-purple-600 focus:bg-white'} ${className}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
        >
            {children}
        </select>
        <label
            htmlFor={id}
            className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-5 z-10 origin-[top_right] pointer-events-none transition-all peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-purple-600 ${Icon ? 'right-12' : 'right-4'} ${error ? 'text-red-500' : 'text-slate-400'}`}
        >
            {label}
        </label>
        {Icon && (
            <Icon
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-20 pointer-events-none ${error ? 'text-red-400' : 'text-slate-400 peer-focus:text-purple-600'}`}
                aria-hidden="true"
            />
        )}
        <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-20" />
        {error && (
            <div
                id={`${id}-error`}
                className="flex items-start gap-2 mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 animate-in slide-in-from-top-1 duration-200"
                role="alert"
            >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
            </div>
        )}
    </div>
);
