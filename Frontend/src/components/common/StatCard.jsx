import React from 'react';

const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-white p-5 md:p-8 border-2 border-gray-900 text-center">
    {Icon && <Icon className="sendstone-dashboard-icon mx-auto mb-3 text-gray-900" size={32} strokeWidth={2.5} />}
    <div className="text-3xl md:text-6xl font-black text-gray-900">{value}</div>
    <div className="text-xs md:text-sm text-gray-600 font-bold uppercase tracking-wider mt-1">{label}</div>
  </div>
);

export default StatCard;
