import React from 'react';
import { User } from 'lucide-react';
import StatCard from '../common/StatCard';

const ProfilePage = ({ user, onSignOut }) => {
  const displayName = user?.name || 'Climber';
  const username = user?.username || 'climber';
  const photo = user?.photoData || null;

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
      {/* Profile Header */}
      <div className="bg-neutral-900 text-neutral-100 p-12 md:p-20 text-center">
        <div className="w-28 h-28 md:w-40 md:h-40 bg-neutral-800 border-4 border-neutral-700 mx-auto mb-4 md:mb-6 flex items-center justify-center overflow-hidden">
          {photo ? (
            <img src={photo} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={56} className="md:w-24 md:h-24" strokeWidth={2.5} />
          )}
        </div>
        <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-widest">
          {displayName}
        </h2>
        <p className="text-neutral-400 font-bold tracking-wider text-base md:text-xl">@{username}</p>
      </div>

      <div className="p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-12">
          <StatCard value="0" label="Total Sends" />
          <StatCard value="V0" label="Max Grade" />
          <StatCard value="12" label="Sessions" />
          <StatCard value="45" label="Days Active" />
        </div>

        {/* Menu Items */}
        <div className="bg-white border-2 border-gray-900">
          {['Sessions', 'Statistics', 'Settings', 'About'].map((item, idx, arr) => (
            <button
              key={item}
              className={`w-full px-5 md:px-8 py-4 md:py-5 flex items-center justify-between hover:bg-neutral-100 ${
                idx !== arr.length - 1 ? 'border-b-2 border-gray-200' : ''
              }`}
            >
              <span className="font-black text-gray-900 uppercase tracking-wider text-base md:text-lg">
                {item}
              </span>
              <span className="text-gray-400 text-2xl font-black">›</span>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={onSignOut}
            className="w-full bg-gray-900 text-white py-4 font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
