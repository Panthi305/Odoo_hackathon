const StatBar = () => {
    const stats = [
        { label: 'Stock Movements Tracked', value: '1.2M+' },
        { label: 'Products Managed', value: '50,000+' },
        { label: 'Automation Accuracy', value: '99.9%' },
        { label: 'Locations Supported', value: 'Unlimited' },
    ];

    return (
        <div className="bg-[#714B67] py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/20">
                    {stats.map((stat, i) => (
                        <div key={i} className="text-center px-4">
                            <div className="text-3xl font-extrabold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-white/70">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatBar;
