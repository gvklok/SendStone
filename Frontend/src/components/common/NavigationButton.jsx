import React from 'react';

const NavigationButton = ({ icon: Icon, label, tabName, activeTab, setActiveTab, setMobileMenuOpen }) => (
  <button
    onClick={() => {
      setActiveTab(tabName);
      if (setMobileMenuOpen) setMobileMenuOpen(false);
    }}
    className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 flex-1 md:flex-none py-3 md:px-6 md:py-3 transition-colors ${
      activeTab === tabName ? 'text-gray-900 md:border-b-4 md:border-blue-500' : 'text-gray-500'
    }`}
  >
    <Icon size={24} strokeWidth={2.5} />
    <span className="text-xs md:text-base font-bold uppercase tracking-wide">{label}</span>
  </button>
);

export default NavigationButton;
