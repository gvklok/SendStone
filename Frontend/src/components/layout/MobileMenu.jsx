import React from 'react';
import { Home, Plus, Search, Bookmark, User, Mountain, X } from 'lucide-react';

const MobileMenu = ({ mobileMenuOpen, setMobileMenuOpen, activeTab, setActiveTab }) => {
  if (!mobileMenuOpen) return null;

  const menuItems = [
    { icon: Home, label: 'Home', tabName: 'home' },
    { icon: Plus, label: 'Create', tabName: 'create' },
    { icon: Search, label: 'Explore', tabName: 'explore' },
    { icon: Bookmark, label: 'Saved', tabName: 'saved' },
    { icon: User, label: 'Profile', tabName: 'profile' },
  ];

  return (
    <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b-2 border-gray-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="border-2 border-blue-500 p-1">
            <Mountain size={24} strokeWidth={3} />
          </div>
          <span className="text-lg font-black uppercase tracking-widest">SendStone</span>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="p-2">
          <X size={28} strokeWidth={2.5} />
        </button>
      </div>
      <div className="flex-1 flex flex-col p-4 gap-2">
        {menuItems.map(({ icon: Icon, label, tabName }) => (
          <button
            key={tabName}
            onClick={() => {
              setActiveTab(tabName);
              setMobileMenuOpen(false);
            }}
            className={`flex items-center gap-4 p-4 border-2 border-gray-900 font-black uppercase tracking-wider ${
              activeTab === tabName ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
            }`}
          >
            <Icon size={24} strokeWidth={2.5} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileMenu;
