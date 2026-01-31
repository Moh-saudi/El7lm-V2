"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

export const WavyBackground = React.forwardRef<HTMLDivElement, {
    children?: any;
    className?: string;
    containerClassName?: string;
    colors?: string[];
    waveWidth?: number;
    backgroundFill?: string;
    blur?: number;
    speed?: "slow" | "fast";
    waveOpacity?: number;
    [key: string]: any;
}>(({
    children,
    className,
    containerClassName,
    colors,
    waveWidth,
    backgroundFill,
    blur = 10,
    speed = "fast",
    waveOpacity = 0.5,
    ...props
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const getSpeed = () => {
        switch (speed) {
            case "slow":
                return 0.001;
            case "fast":
                return 0.002;
            default:
                return 0.001;
        }
    };

    const init = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = ctx.canvas.width = window.innerWidth;
        let h = ctx.canvas.height = window.innerHeight;

        ctx.filter = `blur(${blur}px)`;
        let nt = 0;

        const resize = () => {
            w = ctx.canvas.width = window.innerWidth;
            h = ctx.canvas.height = window.innerHeight;
            ctx.filter = `blur(${blur}px)`;
        };

        window.addEventListener('resize', resize);

        const waveColors = colors ?? [
            "#38bdf8",
            "#818cf8",
            "#c084fc",
            "#e879f9",
            "#22d3ee",
        ];

        const drawWave = (n: number) => {
            nt += getSpeed();
            for (let i = 0; i < n; i++) {
                ctx.beginPath();
                ctx.lineWidth = waveWidth || 50;
                ctx.strokeStyle = waveColors[i % waveColors.length];

                for (let x = 0; x < w; x += 5) {
                    const y = Math.sin(x * 0.002 + nt + i * 0.5) * 50 +
                        Math.sin(x * 0.003 + nt * 0.5 + i) * 25;
                    ctx.lineTo(x, y + h * 0.5);
                }
                ctx.stroke();
                ctx.closePath();
            }
        };

        let animationId: number;
        const render = () => {
            // Clear canvas fully to prevent trails/muddy look
            ctx.globalAlpha = 1;
            ctx.fillStyle = backgroundFill || "black";
            ctx.fillRect(0, 0, w, h);

            // Draw waves with opacity
            ctx.globalAlpha = waveOpacity || 0.5;
            drawWave(5);
            animationId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    };

    useEffect(() => {
        return init();
    }, []);

    const [isSafari, setIsSafari] = useState(false);
    useEffect(() => {
        setIsSafari(
            typeof window !== "undefined" &&
            navigator.userAgent.includes("Safari") &&
            !navigator.userAgent.includes("Chrome")
        );
    }, []);

    return (
        <div
            ref={ref}
            className={cn(
                "h-[100vh] flex flex-col items-center justify-center",
                containerClassName
            )}
        >
            <canvas
                className="absolute inset-0 z-0 w-full h-full"
                ref={canvasRef}
                id="canvas"
                style={{
                    ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
                }}
            ></canvas>
            <div className={cn("relative z-10", className)} {...props}>
                {children}
            </div>
        </div>
    );
});

WavyBackground.displayName = "WavyBackground";
