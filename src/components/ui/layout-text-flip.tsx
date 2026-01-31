"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const LayoutTextFlip = ({
    text,
    words = ["Landing Pages", "Component Blocks", "Page Sections", "3D Shaders"],
    duration = 3000,
    className,
    textClassName
}: {
    text?: string;
    words: string[];
    duration?: number;
    className?: string;
    textClassName?: string;
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
        }, duration);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={cn("inline-flex flex-col sm:flex-row items-center justify-center gap-2", className)}>
            {text && (
                <span
                    className={cn("", textClassName)}
                >
                    {text}
                </span>
            )}

            <div
                className="relative overflow-hidden rounded-xl border border-blue-200/20 bg-white/10 backdrop-blur-sm px-6 py-2 shadow-lg ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10"
            >
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={currentIndex}
                        initial={{ y: 40, opacity: 0, filter: "blur(8px)" }}
                        animate={{
                            y: 0,
                            opacity: 1,
                            filter: "blur(0px)",
                        }}
                        exit={{ y: -40, opacity: 0, filter: "blur(8px)" }}
                        transition={{
                            y: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                            filter: { duration: 0.2 }
                        }}
                        className="inline-block whitespace-nowrap text-center w-full min-w-[140px]"
                    >
                        <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                            {words[currentIndex]}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
