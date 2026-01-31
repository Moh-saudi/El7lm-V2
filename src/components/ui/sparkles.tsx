"use client";
import React, { useId } from "react";
import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { Container, ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { cn } from "@/lib/utils";
import { motion, useAnimation } from "framer-motion";

type Particle = {
    x: number;
    y: number;
    size: number;
    density: number;
};

export const SparklesCore = (props: {
    id?: string;
    className?: string;
    background?: string;
    minSize?: number;
    maxSize?: number;
    speed?: number;
    particleColor?: string;
    particleDensity?: number;
}) => {
    const {
        id,
        className,
        background,
        minSize,
        maxSize,
        speed,
        particleColor,
        particleDensity,
    } = props;
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const controls = useAnimation();

    const particlesLoaded = async (container?: Container) => {
        if (container) {
            controls.start({
                opacity: 1,
                transition: {
                    duration: 1,
                },
            });
        }
    };

    const generatedId = useId();

    return (
        <motion.div animate={controls} className={cn("opacity-0", className)}>
            {init && (
                <Particles
                    id={id || generatedId}
                    className={cn("h-full w-full")}
                    particlesLoaded={particlesLoaded}
                    options={{
                        background: {
                            color: {
                                value: background || "#0d47a1",
                            },
                        },
                        fullScreen: {
                            enable: false,
                            zIndex: 1,
                        },
                        fpsLimit: 120,
                        interactivity: {
                            events: {
                                onClick: {
                                    enable: true,
                                    mode: "push",
                                },
                                onHover: {
                                    enable: false,
                                    mode: "repulse",
                                },
                                resize: { enable: true },
                            },
                            modes: {
                                push: {
                                    quantity: 4,
                                },
                                repulse: {
                                    distance: 200,
                                    duration: 0.4,
                                },
                            },
                        },
                        particles: {
                            color: {
                                value: particleColor || "#ffffff",
                            },
                            links: {
                                color: particleColor || "#ffffff",
                                distance: 150,
                                enable: false,
                                opacity: 0.5,
                                width: 1,
                            },
                            move: {
                                direction: "none",
                                enable: true,
                                outModes: {
                                    default: "bounce",
                                },
                                random: false,
                                speed: speed || 2,
                                straight: false,
                            },
                            number: {
                                density: {
                                    enable: true,
                                    // area: 800,
                                    width: 400,
                                    height: 400
                                },
                                value: particleDensity || 1200,
                            },
                            opacity: {
                                value: 0.5,
                            },
                            shape: {
                                type: "circle",
                            },
                            size: {
                                value: { min: minSize || 0.4, max: maxSize || 1 },
                            },
                        },
                        detectRetina: true,
                    }}
                />
            )}
        </motion.div>
    );
};
