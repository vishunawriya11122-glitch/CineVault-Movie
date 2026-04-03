import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { APP_CONFIG } from '../config';

const links = [
  { label: 'Home', href: '#hero' },
  { label: 'Download', href: '#download' },
  { label: 'Features', href: '#features' },
  { label: 'Preview', href: '#preview' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg shadow-gold/20 group-hover:shadow-gold/40 transition-shadow">
            <span className="text-black font-extrabold text-base">V</span>
          </div>
          <span className="font-bold text-lg tracking-tight">{APP_CONFIG.name}</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#download"
            className="px-5 py-2 bg-gradient-to-r from-gold to-gold-dark text-black font-semibold rounded-full text-sm hover:opacity-90 transition-opacity shadow-lg shadow-gold/20"
          >
            Download
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-white p-1"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/5 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-gray-300 hover:text-white transition-colors text-base"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#download"
                onClick={() => setOpen(false)}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-dark text-black font-semibold rounded-full text-sm text-center"
              >
                Download App
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
