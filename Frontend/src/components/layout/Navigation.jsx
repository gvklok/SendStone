import React from 'react';
import { Home, Plus, Search, Bookmark, User, Mountain, Menu, X } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const menuItems = [
    { icon: Home, label: 'Home', tabName: 'home' },
    { icon: Plus, label: 'Create', tabName: 'create' },
    { icon: Search, label: 'Explore', tabName: 'explore' },
    { icon: Bookmark, label: 'Saved', tabName: 'saved' },
    { icon: User, label: 'Profile', tabName: 'profile' },
  ];

  return (
    <>
      {/* Desktop Top Bar */}
      <nav className="hidden md:flex bg-white border-b-2 border-gray-900 items-center justify-between px-8">
        <div className="flex items-center gap-3 py-4">
          <div className="p-2">
            <Mountain size={32} strokeWidth={3} />
          </div>
          <span className="text-2xl font-black uppercase tracking-widest">SendStone</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <Menu size={32} strokeWidth={2.5} />
        </button>
      </nav>

      {/* Desktop Sidebar */}
      <div 
        className={`hidden md:block fixed top-0 right-0 h-full bg-white border-l-2 border-gray-900 transition-transform duration-300 ease-in-out z-50 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '300px' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-gray-900">
            <span className="text-xl font-black uppercase tracking-widest">Menu</span>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 transition-colors"
            >
              <X size={28} strokeWidth={2.5} />
            </button>
          </div>

          {/* Sidebar Menu Items */}
          <div className="flex-1 flex flex-col p-4 gap-2">
            {menuItems.map(({ icon: Icon, label, tabName }) => (
              <button
                key={tabName}
                onClick={() => {
                  setActiveTab(tabName);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-4 p-4 border-2 border-gray-900 font-black uppercase tracking-wider transition-colors ${
                  activeTab === tabName ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={24} strokeWidth={2.5} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="hidden md:block fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;
