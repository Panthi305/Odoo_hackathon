import { Link } from 'react-router-dom';
import { Boxes, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-gray-400">
            <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
                <div className="grid md:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 bg-[#714B67] rounded-md flex items-center justify-center">
                                <Boxes size={14} className="text-white" />
                            </div>
                            <span className="text-white font-bold text-base">CoreInventory</span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-500">
                            Digitizing and streamlining stock operations for modern businesses. Built for the Odoo Hackathon 2026.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Navigation</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                            <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Contact</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2">
                                <Mail size={14} className="shrink-0" />
                                <a href="mailto:support@coreinventory.io" className="hover:text-white transition-colors">support@coreinventory.io</a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone size={14} className="shrink-0" />
                                <a href="tel:+916354130712" className="hover:text-white transition-colors">+91 63541 30712</a>
                            </li>
                            <li className="flex items-start gap-2">
                                <MapPin size={14} className="shrink-0 mt-0.5" />
                                <span>LJ University, Ahmedabad, Gujarat</span>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Stay Updated</h4>
                        <p className="text-sm text-gray-500 mb-3">Get product updates and news.</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="your@email.com"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#714B67]"
                            />
                            <button className="px-4 py-2 bg-[#714B67] text-white text-sm font-medium rounded-md hover:bg-[#5d3d56] transition-colors">
                                Go
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
                    <p>&copy; 2026 CoreInventory. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="/contact" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
                        <Link to="/contact" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
