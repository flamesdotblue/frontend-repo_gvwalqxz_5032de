import React from 'react';
import Spline from '@splinetool/react-spline';

// Full-bleed Spline background cover for the hero
export default function SplineCover() {
  return (
    <div className="relative w-full h-full min-h-screen bg-black">
      <Spline
        scene="https://prod.spline.design/vc19ejtcC5VJjy5v/scene.splinecode"
        style={{ width: '100%', height: '100%' }}
      />
      {/* Subtle vignette to add depth without blocking interaction */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
    </div>
  );
}
