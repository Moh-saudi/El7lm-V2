"use client";
import React from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamic import for the World component as it uses Three.js and should only be rendered on the client
const World = dynamic(() => import("@/components/ui/globe").then((m) => m.World), {
  ssr: false,
});

export function GlobalReach() {
  const globeConfig = {
    pointSize: 4,
    globeColor: "#062056",
    showAtmosphere: true,
    atmosphereColor: "#FFFFFF",
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    emissive: "#062056",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 1000,
    arcLength: 0.8,
    rings: 1,
    maxRings: 3,
    autoRotate: true,
    autoRotateSpeed: 0.5,
  };

  const colors = ["#06b6d4", "#3b82f6", "#6366f1"];
  const sampleArcs = [
    { order: 1, startLat: 24.7136, startLng: 46.6753, endLat: 48.8566, endLng: 2.3522, arcAlt: 0.1, color: colors[0] }, // Riyadh to Paris
    { order: 2, startLat: 21.4858, startLng: 39.1925, endLat: 40.4168, endLng: -3.7038, arcAlt: 0.2, color: colors[1] }, // Jeddah to Madrid
    { order: 3, startLat: 25.276987, startLng: 55.296249, endLat: 51.5074, endLng: -0.1278, arcAlt: 0.3, color: colors[2] }, // Dubai to London
    { order: 4, startLat: 24.7136, startLng: 46.6753, endLat: 34.0522, endLng: -118.2437, arcAlt: 0.5, color: colors[0] }, // Riyadh to LA
    { order: 5, startLat: -23.5505, startLng: -46.6333, endLat: 24.7136, endLng: 46.6753, arcAlt: 0.4, color: colors[1] }, // Sao Paulo to Riyadh
    { order: 6, startLat: 35.6762, startLng: 139.6503, endLat: 24.7136, endLng: 46.6753, arcAlt: 0.3, color: colors[2] }, // Tokyo to Riyadh
  ];

  return (
    <section id="global" className="py-20 bg-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 mb-4"
          >
            وصول عالمي للمواهب
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto"
          >
            نحن نربط اللاعبين بالأندية والوكلاء في جميع أنحاء العالم. طموحك ليس له حدود جغرافية.
          </motion.p>
        </div>

        <div className="relative h-[600px] w-full">
          <div className="absolute inset-0 z-0">
            <World data={sampleArcs} globeConfig={globeConfig} />
          </div>
          
          {/* Overlay Stats */}
          <div className="absolute bottom-10 left-10 right-10 flex flex-wrap justify-center gap-8 z-20">
            <StatCard label="أندية مسجلة" value="+500" />
            <StatCard label="دولة" value="+120" />
            <StatCard label="لاعب نشط" value="+50K" />
          </div>
        </div>
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-center min-w-[160px]"
    >
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-neutral-400 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}
