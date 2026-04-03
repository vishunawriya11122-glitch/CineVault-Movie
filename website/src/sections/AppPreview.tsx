import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APP_CONFIG } from '../config';

export default function AppPreview() {
  const screenshots = APP_CONFIG.screenshots;
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % screenshots.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay, screenshots.length]);

  const goTo = (index: number) => {
    setCurrent(index);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const prev = () => goTo((current - 1 + screenshots.length) % screenshots.length);
  const next = () => goTo((current + 1) % screenshots.length);

  return (
    <section id="preview" className="relative py-28 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-gold/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            App <span className="gradient-text">Preview</span>
          </h2>
          <p className="text-gray-400 text-lg">
            See what awaits you inside.
          </p>
        </motion.div>

        {/* Phone carousel */}
        <div className="flex items-center justify-center gap-6">
          {/* Nav arrow left */}
          <button
            onClick={prev}
            className="hidden sm:flex w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 items-center justify-center transition-all shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Phone frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Animated glow */}
            <div className="absolute -inset-10 bg-gradient-to-br from-gold/10 via-transparent to-gold/5 rounded-full blur-3xl animate-glow-pulse" />

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              {/* Phone body */}
              <div className="relative w-[300px] h-[620px] sm:w-[320px] sm:h-[660px] rounded-[44px] border-[3px] border-white/10 bg-black overflow-hidden glow-gold">
                {/* Dynamic Island */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-[26px] bg-black rounded-full z-20" />

                {/* Screenshot */}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={current}
                    src={screenshots[current]}
                    alt={`Preview ${current + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </AnimatePresence>

                {/* Fallback */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-surface to-black -z-10">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                      <span className="text-black font-extrabold text-2xl">V</span>
                    </div>
                    <p className="text-gray-500 text-sm">Preview {current + 1}</p>
                  </div>
                </div>

                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10" />

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-20" />
              </div>
            </motion.div>
          </motion.div>

          {/* Nav arrow right */}
          <button
            onClick={next}
            className="hidden sm:flex w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 items-center justify-center transition-all shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {screenshots.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 h-2.5 bg-gold'
                  : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Mobile swipe hint */}
        <div className="flex sm:hidden items-center justify-center gap-4 mt-6">
          <button onClick={prev} className="p-2 rounded-full bg-white/5">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="p-2 rounded-full bg-white/5">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
