import React from 'react';
import { Mountain, Bookmark } from 'lucide-react';

const SavedProblemCard = ({ id, grade, savedDate }) => (
  <div className="bg-white border-2 border-gray-900 p-5 md:p-6 flex gap-4 md:gap-6">
    <div className="bg-neutral-900 w-24 h-24 md:w-32 md:h-32 border-2 border-gray-900 flex-shrink-0 flex items-center justify-center">
      <Mountain className="text-neutral-700 opacity-40" size={40} strokeWidth={3} />
    </div>
    <div className="flex-1">
      <h4 className="font-black mb-1 text-gray-900 uppercase tracking-wider text-base md:text-xl">
        Problem #{id}
      </h4>
      <p className="text-sm md:text-base text-gray-600 mb-2 font-bold">Grade: {grade}</p>
      <div className="text-xs md:text-sm text-gray-500 font-semibold uppercase tracking-wide">
        Saved {savedDate}
      </div>
    </div>
    <Bookmark 
      size={22} 
      className="text-blue-500 flex-shrink-0" 
      fill="currentColor" 
      strokeWidth={2.5} 
    />
  </div>
);

export default SavedProblemCard;
