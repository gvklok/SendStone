import React from 'react';
import { Search } from 'lucide-react';
import ProblemGridCard from '../common/ProblemGridCard';

const ExplorePage = () => (
  <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-black mb-5 md:mb-8 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
        Explore
      </h2>
      
      {/* Search Bar */}
      <div className="mb-6 md:mb-8">
        <div className="relative">
          <Search 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" 
            size={20} 
            strokeWidth={2.5} 
          />
          <input
            type="text"
            placeholder="SEARCH PROBLEMS..."
            className="w-full pl-12 pr-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-3 mb-6 md:mb-10 overflow-x-auto pb-2">
        {['All', 'V0-V3', 'V4-V6', 'V7-V9', 'V10+'].map(filter => (
          <button
            key={filter}
            className="px-4 md:px-6 py-2 md:py-3 bg-white border-2 border-gray-900 text-sm md:text-base font-black text-gray-900 hover:bg-gray-900 hover:text-neutral-100 whitespace-nowrap uppercase tracking-wider transition-colors"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Problem Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <ProblemGridCard 
            key={i} 
            id={i} 
            grade={`V${i + 2}`} 
            sends={24} 
          />
        ))}
      </div>
    </div>
  </div>
);

export default ExplorePage;
