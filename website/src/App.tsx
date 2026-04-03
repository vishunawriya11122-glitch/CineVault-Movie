import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import Download from './sections/Download';
import Features from './sections/Features';
import AppPreview from './sections/AppPreview';
import FAQ from './sections/FAQ';
import Footer from './sections/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Download />
        <Features />
        <AppPreview />
        <FAQ />
        <Footer />
      </main>
    </div>
  );
}
