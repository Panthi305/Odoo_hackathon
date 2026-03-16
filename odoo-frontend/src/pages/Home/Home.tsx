import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DetailedFeatures from './DetailedFeatures';
import Hero from './Hero';
import StatBar from './StatBar';
import Workflow from './Workflow';

const CTA = () => (
    <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#714B67] rounded-2xl px-10 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-white mb-3">Ready to take control of your inventory?</h2>
                    <p className="text-white/70 text-lg max-w-xl">
                        Join teams already using CoreInventory to streamline operations, reduce errors, and move faster.
                    </p>
                </div>
                <div className="flex gap-4 shrink-0">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#714B67] font-semibold rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Get Started Free
                        <ArrowRight size={16} />
                    </Link>
                    <Link
                        to="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-semibold rounded-md hover:bg-white/10 transition-colors"
                    >
                        Contact Sales
                    </Link>
                </div>
            </div>
        </div>
    </section>
);

const Home = () => {
    return (
        <div className="w-full">
            <Hero />
            <StatBar />
            <DetailedFeatures />
            <Workflow />
            <CTA />
        </div>
    );
};

export default Home;
