import { motion } from 'framer-motion';
import {
  Play,
  Globe,
  Bookmark,
  Zap,
  MonitorPlay,
  Download,
} from 'lucide-react';
import { APP_CONFIG } from '../config';

const iconMap: Record<string, React.ElementType> = {
  Play,
  Globe,
  Bookmark,
  Zap,
  MonitorPlay,
  Download,
};

export default function Features() {
  return (
    <section id="features" className="relative py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Packed with <span className="gradient-text">Features</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Everything you need for the ultimate streaming experience.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {APP_CONFIG.features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Play;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
              >
                {/* Icon circle */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-lg font-semibold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
