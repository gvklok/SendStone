import React from 'react';
import { Home, Plus, Search, Bookmark, User, Mountain } from 'lucide-react';
import NavigationButton from '../common/NavigationButton';

const Navigation = ({ activeTab, setActiveTab }) => (
  <nav className="hidden md:flex bg-white border-b-2 border-gray-900 items-center justify-between px-8">
    <div className="flex items-center gap-3 py-4">
      <div className="border-2 border-blue-500 p-2">
        <Mountain size={32} strokeWidth={3} />
      </div>
      <span className="text-2xl font-black uppercase tracking-widest">SendStone</span>
    </div>
    <div className="flex">
      <NavigationButton icon={Home} label="Home" tabName="home" activeTab={activeTab} setActiveTab={setActiveTab} />
      <NavigationButton icon={Plus} label="Create" tabName="create" activeTab={activeTab} setActiveTab={setActiveTab} />
      <NavigationButton icon={Search} label="Explore" tabName="explore" activeTab={activeTab} setActiveTab={setActiveTab} />
      <NavigationButton icon={Bookmark} label="Saved" tabName="saved" activeTab={activeTab} setActiveTab={setActiveTab} />
      <NavigationButton icon={User} label="Profile" tabName="profile" activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  </nav>
);

export default Navigation;
