import React, { useState } from 'react';
import Navigation from './components/layout/Navigation';
import Header from './components/layout/Header';
import MobileMenu from './components/layout/MobileMenu';
import MobileBottomNav from './components/layout/MobileBottomNav';
import HomePage from './components/pages/HomePage';
import CreatePage from './components/pages/CreatePage';
import ExplorePage from './components/pages/ExplorePage';
import SavedPage from './components/pages/SavedPage';
import ProfilePage from './components/pages/ProfilePage';

export default function ClimbingBoardApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Desktop Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Mobile Header */}
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Mobile Menu Overlay */}
      <MobileMenu 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Content Area */}
      {activeTab === 'home' && <HomePage />}
      {activeTab === 'create' && <CreatePage />}
      {activeTab === 'explore' && <ExplorePage />}
      {activeTab === 'saved' && <SavedPage />}
      {activeTab === 'profile' && <ProfilePage />}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}