import React from 'react';
import { Home, Plus, Search, Bookmark, User } from 'lucide-react';
import NavigationButton from '../common/NavigationButton';

const MobileBottomNav = ({ activeTab, setActiveTab }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-900 flex">
    <NavigationButton icon={Home} label="Home" tabName="home" activeTab={activeTab} setActiveTab={setActiveTab} />
    <NavigationButton icon={Plus} label="Create" tabName="create" activeTab={activeTab} setActiveTab={setActiveTab} />
    <NavigationButton icon={Search} label="Explore" tabName="explore" activeTab={activeTab} setActiveTab={setActiveTab} />
    <NavigationButton icon={Bookmark} label="Saved" tabName="saved" activeTab={activeTab} setActiveTab={setActiveTab} />
    <NavigationButton icon={User} label="Profile" tabName="profile" activeTab={activeTab} setActiveTab={setActiveTab} />
  </nav>
);

export default MobileBottomNav;
