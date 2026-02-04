"use client";
import Image from "next/image";
import React, { useState } from "react";
import {
    motion,
    useTransform,
    AnimatePresence,
    useMotionValue,
    useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

export const AnimatedTooltip = ({
    items,
    className,
    marquee = false,
}: {
    items: {
        id: number;
        name: string;
        designation: string;
        image: string;
    }[];
    className?: string;
    marquee?: boolean;
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const springConfig = { stiffness: 100, damping: 5 };
    const x = useMotionValue(0);
    const rotate = useSpring(
        useTransform(x, [-100, 100], [-45, 45]),
        springConfig
    );
    const translateX = useSpring(
        useTransform(x, [-100, 100], [-50, 50]),
        springConfig
    );
    const handleMouseMove = (event: any) => {
        const halfWidth = event.target.offsetWidth / 2;
        x.set(event.nativeEvent.offsetX - halfWidth);
    };

    const TooltipItem = ({ item }: { item: any }) => (
        <div
            className="relative group shrink-0 mx-4 md:mx-6" // Added margins instead of gap
            key={item.name}
            onMouseEnter={() => setHoveredIndex(item.id)}
            onMouseLeave={() => setHoveredIndex(null)}
        >
            <AnimatePresence mode="popLayout">
                {hoveredIndex === item.id && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.6 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                                type: "spring",
                                stiffness: 260,
                                damping: 10,
                            },
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.6 }}
                        style={{
                            translateX: translateX,
                            rotate: rotate,
                            whiteSpace: "nowrap",
                        }}
                        className="absolute -top-24 -left-1/2 translate-x-1/2 flex text-xs flex-col items-center justify-center rounded-md bg-black z-50 shadow-xl px-4 py-2"
                    >
                        <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent h-px" />
                        <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px" />
                        <div className="font-bold text-white relative z-30 text-base">
                            {item.name}
                        </div>
                        <div className="text-white text-xs">
                            {item.designation}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Image
                onMouseMove={handleMouseMove}
                height={200}
                width={200}
                src={item.image}
                alt={item.name}
                className="object-cover !m-0 !p-0 object-top rounded-full h-32 w-32 border-4 border-white dark:border-slate-800 shadow-xl group-hover:scale-110 group-hover:z-30 relative transition duration-500"
            />
        </div>
    );

    if (marquee) {
        // Create a massive list to ensure we cover even the widest screens
        // duplicate 10 times
        const trackItems = [...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items];

        return (
            <div className={cn("w-full overflow-hidden", className)}>
                <motion.div
                    className="flex w-max min-w-full"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        repeat: Infinity,
                        ease: "linear",
                        duration: 80, // Even smoother
                    }}
                >
                    {/* Render TWO identical sets of the massive list. 
                        Animation moves 50% (the width of one set).
                        When it hits 50%, it resets to 0. 
                        Since Set 1 == Set 2, it is seamless. 
                    */}
                    <div className="flex shrink-0">
                        {trackItems.map((item, idx) => (
                            <TooltipItem key={`1-${item.name}-${idx}`} item={{ ...item, id: idx + 10000 }} />
                        ))}
                    </div>
                    <div className="flex shrink-0">
                        {trackItems.map((item, idx) => (
                            <TooltipItem key={`2-${item.name}-${idx}`} item={{ ...item, id: idx + 20000 }} />
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-wrap items-center justify-center", className)}>
            {items.map((item) => (
                <TooltipItem key={item.name} item={item} />
            ))}
        </div>
    );
};
