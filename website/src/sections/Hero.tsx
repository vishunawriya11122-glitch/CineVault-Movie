import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_CONFIG } from '../config';

export default function Hero() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const screenshots = APP_CONFIG.screenshots;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentScreen((prev) => (prev + 1) % screenshots.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [screenshots.length]);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
        {/* Left: Text */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-gold text-sm font-medium">Now Available</span>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            <span className="gradient-text">{APP_CONFIG.name}</span>
            <br />
            <span className="text-white">{APP_CONFIG.tagline}</span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-gray-400 text-lg max-w-md mx-auto lg:mx-0 mb-10 leading-relaxed"
          >
            {APP_CONFIG.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
          >
            <a
              href="#download"
              className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-dark text-black font-bold rounded-full text-base hover:opacity-90 transition-all shadow-xl shadow-gold/25 hover:shadow-gold/40"
            >
              Download Now
            </a>
            <a
              href="#features"
              className="px-8 py-3.5 border border-white/10 text-white font-medium rounded-full text-base hover:bg-white/5 transition-all"
            >
              Learn More
            </a>
          </motion.div>
        </motion.div>

        {/* Right: Phone Mockup */}
        <motion.div
          className="flex-shrink-0"
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
        >
          <div className="relative">
            {/* Glow behind phone */}
            <div className="absolute -inset-12 bg-gradient-to-b from-gold/15 via-gold/5 to-transparent rounded-full blur-3xl animate-glow-pulse" />

            {/* Phone floating animation */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              {/* Phone frame */}
              <div className="relative w-[280px] h-[580px] rounded-[44px] border-[3px] border-white/10 bg-black overflow-hidden glow-gold">
                {/* Dynamic Island */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-[26px] bg-black rounded-full z-20" />

                {/* Screenshot carousel */}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentScreen}
                    src={screenshots[currentScreen]}
                    alt="App preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.6 }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </AnimatePresence>

                {/* Fallback when no screenshots */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-surface to-black">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                      <span className="text-black font-extrabold text-2xl">V</span>
                    </div>
                    <p className="text-gray-500 text-sm">{APP_CONFIG.name}</p>
                  </div>
                </div>

                {/* Screen overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none z-10" />

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-20" />
              </div>

              {/* Side buttons */}
              <div className="absolute top-24 -right-[2px] w-[3px] h-12 bg-white/10 rounded-l-full" />
              <div className="absolute top-20 -left-[2px] w-[3px] h-8 bg-white/10 rounded-r-full" />
              <div className="absolute top-32 -left-[2px] w-[3px] h-16 bg-white/10 rounded-r-full" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 bg-gold rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}
