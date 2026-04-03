import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { APP_CONFIG } from '../config';

export default function Footer() {
  return (
    <footer className="relative py-16 px-6 border-t border-white/5">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-8">
          {/* Animated logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Glow ring */}
            <div className="absolute -inset-4 bg-gold/10 rounded-full blur-xl animate-glow-pulse" />

            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-xl shadow-gold/20">
              <span className="text-black font-extrabold text-2xl">V</span>
            </div>
          </motion.div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="#download"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Download
            </a>
            <a
              href="#features"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#faq"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              FAQ
            </a>
          </div>

          {/* Divider */}
          <div className="w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Credits */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-500 flex items-center gap-1.5"
          >
            Made with{' '}
            <Heart className="w-4 h-4 text-red-500 fill-red-500 inline" />{' '}
            Powered by {APP_CONFIG.name}
          </motion.p>

          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
