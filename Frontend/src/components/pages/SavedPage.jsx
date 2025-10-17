import React from 'react';
import SavedProblemCard from '../common/SavedProblemCard';

const SavedPage = () => (
  <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-black mb-6 md:mb-10 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
        Saved Problems
      </h2>
      
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SavedProblemCard 
            key={i} 
            id={i} 
            grade={`V${i + 4}`} 
            savedDate="3 days ago" 
          />
        ))}
      </div>
    </div>
  </div>
);

export default SavedPage;
