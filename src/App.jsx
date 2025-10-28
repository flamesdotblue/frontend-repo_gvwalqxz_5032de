import React, { useState } from 'react';
import LoaderCanvas from './components/LoaderCanvas';
import HeroSection from './components/HeroSection';

export default function App() {
  const [done, setDone] = useState(false);

  return (
    <div className="min-h-screen w-full bg-black text-white">
      {!done && (
        <div className="fixed inset-0 z-50 bg-black">
          <LoaderCanvas onComplete={() => setDone(true)} />
        </div>
      )}
      <main className={`relative ${done ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500` }>
        <HeroSection />
      </main>
    </div>
  );
}
