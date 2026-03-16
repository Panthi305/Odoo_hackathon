import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, Clock, MessageSquare } from 'lucide-react';
import axios from 'axios';

const Contact = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        subject: 'General Inquiry',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/contact/send`, {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                subject: formData.subject,
                message: formData.message
            });
            if (response.data.status === 'success') {
                setSuccess(true);
                setFormData({ firstName: '', lastName: '', email: '', subject: 'General Inquiry', message: '' });
                setTimeout(() => setSuccess(false), 6000);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-colors";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <p className="text-sm font-semibold text-[#714B67] uppercase tracking-wider mb-2">Contact</p>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Get in Touch</h1>
                    <p className="text-gray-500 text-lg max-w-xl">
                        Have questions about CoreInventory? Our team is ready to help you get started and scale confidently.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left — Info Cards */}
                    <div className="space-y-4">
                        {[
                            {
                                icon: Phone,
                                title: 'Call Us',
                                lines: ['+91 63541 30712'],
                                sub: 'Mon–Fri, 9am–6pm IST',
                            },
                            {
                                icon: Mail,
                                title: 'Email Us',
                                lines: ['support@coreinventory.io'],
                                sub: 'We reply within 24 hours',
                            },
                            {
                                icon: MapPin,
                                title: 'Visit Us',
                                lines: ['LJ University', 'Ahmedabad, Gujarat, India'],
                                sub: null,
                            },
                            {
                                icon: Clock,
                                title: 'Response Time',
                                lines: ['Within 24 hours'],
                                sub: 'For all support requests',
                            },
                        ].map((item, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
                                <div className="w-10 h-10 bg-[#714B67]/8 rounded-lg flex items-center justify-center shrink-0">
                                    <item.icon size={18} className="text-[#714B67]" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
                                    {item.lines.map((l, j) => (
                                        <p key={j} className="text-sm text-gray-600">{l}</p>
                                    ))}
                                    {item.sub && <p className="text-xs text-gray-400 mt-1">{item.sub}</p>}
                                </div>
                            </div>
                        ))}

                        {/* FAQ hint */}
                        <div className="bg-[#714B67] rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare size={16} className="text-white" />
                                <span className="text-sm font-semibold text-white">Quick Support</span>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">
                                For technical issues, include your account email and a brief description of the problem.
                            </p>
                        </div>
                    </div>

                    {/* Right — Form */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Send a Message</h2>
                        <p className="text-sm text-gray-500 mb-6">Fill out the form and we'll get back to you within 24 hours.</p>

                        {success && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                                <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-green-800">Message sent successfully</p>
                                    <p className="text-xs text-green-600 mt-0.5">Check your email for a confirmation. We'll be in touch soon.</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>First Name</label>
                                    <input type="text" placeholder="John" value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        required className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Last Name</label>
                                    <input type="text" placeholder="Doe" value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        required className={inputClass} />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Email Address</label>
                                <input type="email" placeholder="john@company.com" value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>Subject</label>
                                <select value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    className={inputClass}>
                                    <option>General Inquiry</option>
                                    <option>Technical Support</option>
                                    <option>Feature Request</option>
                                    <option>Partnership</option>
                                    <option>Bug Report</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Message</label>
                                <textarea rows={5} placeholder="Describe your question or issue in detail..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    required className={`${inputClass} resize-none`}></textarea>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <p className="text-xs text-gray-400">All fields are required.</p>
                                <button type="submit" disabled={loading}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#714B67] text-white text-sm font-semibold rounded-md hover:bg-[#5d3d56] disabled:opacity-50 transition-colors">
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={15} />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
