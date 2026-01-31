"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

export const BackgroundLines = ({
    children,
    className,
    svgOptions,
}: {
    children?: React.ReactNode;
    className?: string;
    svgOptions?: {
        duration?: number;
    };
}) => {
    return (
        <div
            className={cn(
                "h-[20rem] md:h-screen w-full bg-transparent flex flex-col items-center justify-center relative overflow-hidden",
                className
            )}
        >
            <div className="absolute inset-0 w-full h-full bg-neutral-950 z-0 pointer-events-none">
                <SVG svgOptions={svgOptions} />
            </div>
            <div className="relative z-10 w-full">{children}</div>
        </div>
    );
};

const SVG = ({
    svgOptions,
}: {
    svgOptions?: {
        duration?: number;
    };
}) => {
    const paths = [
        "M-200 0h200v200h-200z",
        "M800 1200h200v200h-200z",
        "M1400 0h200v200h-200z",
        "M-200 800h200v200h-200z",
        "M200 0h200v200h-200z",
        "M400 1000h200v200h-200z",
        "M1200 1000h200v200h-200z",
        "M-400 400h200v200h-200z",
        "M1000 600h200v200h-200z",
        "M200 1200h200v200h-200z",
        "M-200 600h200v200h-200z",
        "M1400 200h200v200h-200z",
        "M600 200h200v200h-200z",
        "M1000 1000h200v200h-200z",
        "M-400 1200h200v200h-200z",
        "M1400 400h200v200h-200z",
        "M-200 200h200v200h-200z",
        "M1000 0h200v200h-200z",
        "M400 200h200v200h-200z",
        "M0 400h200v200h-200z",
        "M1200 0h200v200h-200z",
        "M0 1000h200v200h-200z",
        "M1400 1000h200v200h-200z",
        "M800 0h200v200h-200z",
        "M0 0h200v200h-200z",
        "M0 200h200v200h-200z",
        "M100 0h200v200h-200z",
        "M600 600h200v200h-200z",
        "M1200 1200h200v200h-200z",
        "M600 1200h200v200h-200z",
        "M1000 400h200v200h-200z",
        "M1200 400h200v200h-200z",
        "M1400 600h200v200h-200z",
        "M400 1200h200v200h-200z",
        "M-400 0h200v200h-200z",
        "M-400 1000h200v200h-200z",
        "M-200 1000h200v200h-200z",
        "M200 1000h200v200h-200z",
        "M1200 200h200v200h-200z",
        "M-400 200h200v200h-200z",
        "M800 200h200v200h-200z",
        "M1400 1200h200v200h-200z",
        "M200 600h200v200h-200z",
        "M1000 200h200v200h-200z",
        "M600 400h200v200h-200z",
        "M800 400h200v200h-200z",
        "M-200 1200h200v200h-200z",
        "M1200 600h200v200h-200z",
        "M0 800h200v200h-200z",
        "M1200 800h200v200h-200z",
        "M100 800h200v200h-200z",
        "M400 600h200v200h-200z",
        "M0 600h200v200h-200z",
        "M400 400h200v200h-200z",
        "M600 0h200v200h-200z",
        "M200 800h200v200h-200z",
        "M800 800h200v200h-200z",
        "M400 800h200v200h-200z",
        "M-200 400h200v200h-200z",
        "M-400 600h200v200h-200z",
        "M600 1000h200v200h-200z",
        "M200 200h200v200h-200z",
        "M800 600h200v200h-200z",
        "M-400 800h200v200h-200z",
        "M800 1000h200v200h-200z",
        "M1400 800h200v200h-200z",
        "M200 400h200v200h-200z",
        "M400 0h200v200h-200z",
        "M1000 800h200v200h-200z",
    ];

    const colors = [
        "#3b82f6", // Blue
        "#6366f1", // Indigo
        "#8b5cf6", // Violet
        "#ec4899", // Pink
        "#10b981", // Emerald
        "#06b6d4", // Cyan
    ];

    return (
        <motion.svg
            viewBox="0 0 1600 1600"
            className="absolute top-0 left-0 w-full h-full opacity-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
        >
            {paths.map((path, idx) => (
                <motion.path
                    key={idx}
                    d={path}
                    stroke={colors[idx % colors.length]}
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: 1,
                        opacity: [0, 1, 0.5, 1],
                        strokeDashoffset: [0, 1000],
                    }}
                    transition={{
                        duration: svgOptions?.duration || 30,
                        ease: "linear",
                        repeat: Infinity,
                        repeatType: "loop",
                        delay: Math.random() * 5,
                    }}
                />
            ))}
        </motion.svg>
    );
};
