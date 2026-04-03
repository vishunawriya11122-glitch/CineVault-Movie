import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { APP_CONFIG } from '../config';

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <span className="font-medium text-base sm:text-lg pr-4">{question}</span>
        <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
          {open ? (
            <Minus className="w-4 h-4 text-gold" />
          ) : (
            <Plus className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="relative py-28 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="gradient-text">FAQ</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Got questions? We've got answers.
          </p>
        </motion.div>

        {/* FAQ items */}
        <div className="space-y-3">
          {APP_CONFIG.faq.map((item, i) => (
            <FAQItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
