import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Boxes, Menu, X } from 'lucide-react';

const Navbar = () => {
    const token = localStorage.getItem('access_token');
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/contact', label: 'Contact' },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#714B67] rounded-md flex items-center justify-center">
                            <Boxes size={16} className="text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 tracking-tight">CoreInventory</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === link.to
                                        ? 'text-[#714B67] bg-[#714B67]/8'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="hidden md:flex items-center gap-3">
                        {token ? (
                            <Link
                                to="/app/dashboard"
                                className="px-4 py-2 bg-[#714B67] text-white text-sm font-medium rounded-md hover:bg-[#5d3d56] transition-colors"
                            >
                                Go to App
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                                    Sign In
                                </Link>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 bg-[#714B67] text-white text-sm font-medium rounded-md hover:bg-[#5d3d56] transition-colors"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile toggle */}
                    <button
                        className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-200 bg-white px-6 py-4 space-y-1">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setMobileOpen(false)}
                            className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="pt-3 border-t border-gray-100 mt-3">
                        <Link
                            to="/login"
                            onClick={() => setMobileOpen(false)}
                            className="block w-full text-center px-4 py-2 bg-[#714B67] text-white text-sm font-medium rounded-md"
                        >
                            {token ? 'Go to App' : 'Get Started'}
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
