import React from 'react';
import { Home, Plus, Search, Bookmark, User, Mountain, Menu, X, MapPinned } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, sidebarPinned = false }) => {
  const PINNED_WIDTH = 116;
  const DEFAULT_WIDTH = 300;
  const sidebarWidth = sidebarPinned ? PINNED_WIDTH : DEFAULT_WIDTH;
  const menuItems = [
    { icon: Home, label: 'Home', tabName: 'home' },
    { icon: Plus, label: 'Create', tabName: 'create' },
    { icon: Search, label: 'Explore', tabName: 'explore' },
    { icon: Bookmark, label: 'Saved', tabName: 'saved' },
    { icon: MapPinned, label: 'Your Routes', tabName: 'yourRoutes' },
    { icon: User, label: 'Profile', tabName: 'profile' },
  ];
  const sidebarVisible = sidebarPinned || sidebarOpen;

  return (
    <>
      {/* Desktop Top Bar */}
      <nav className="hidden md:flex h-[74px] bg-white border-b-2 border-gray-900 items-center justify-between px-8">
        <div className="flex items-center gap-3 h-full">
          <div className="p-2">
            <Mountain className="sendstone-header-mountain" size={32} strokeWidth={3} />
          </div>
          <span className="text-2xl font-black uppercase tracking-widest">SendStone</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarVisible)}
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <Menu className="sendstone-burger-icon" size={32} strokeWidth={2.5} />
        </button>
      </nav>

      {/* Desktop Sidebar */}
      <div 
        className={`hidden md:block fixed top-0 right-0 h-full bg-white border-l-2 border-gray-900 transition-transform duration-300 ease-in-out z-50 ${
          sidebarVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`flex items-center ${sidebarPinned ? 'justify-center' : 'justify-between'} h-[74px] px-4 border-b-2 border-gray-900`}>
            <span className={`${sidebarPinned ? 'text-sm' : 'text-xl'} font-black uppercase tracking-widest`}>Menu</span>
            {!sidebarPinned && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="sendstone-burger-icon" size={28} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Sidebar Menu Items */}
          <div className={`flex-1 flex flex-col ${sidebarPinned ? 'p-2 gap-1' : 'p-4 gap-2'}`}>
            {menuItems.map(({ icon: Icon, label, tabName }) => (
              <button
                key={tabName}
                onClick={() => {
                  setActiveTab(tabName);
                  if (!sidebarPinned) setSidebarOpen(false);
                }}
                className={`border-2 border-gray-900 font-black uppercase transition-colors ${
                  sidebarPinned
                    ? 'h-16 flex flex-col items-center justify-center gap-1 p-1 tracking-wide'
                    : 'flex items-center gap-4 p-4 tracking-wider'
                } sendstone-sidebar-btn ${
                  activeTab === tabName
                    ? 'sendstone-sidebar-selected bg-blue-500 text-white'
                    : 'sendstone-sidebar-unselected bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="sendstone-nav-icon" size={sidebarPinned ? 20 : 24} strokeWidth={2.5} />
                <span className={sidebarPinned ? 'text-[10px] leading-tight text-center' : ''}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {!sidebarPinned && sidebarOpen && (
        <div 
          className="hidden md:block fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;
