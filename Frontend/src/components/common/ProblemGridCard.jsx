import React from 'react';
import { Mountain, Bookmark } from 'lucide-react';

const ProblemGridCard = ({ id, grade, sends }) => (
  <div className="bg-white border-2 border-gray-900 overflow-hidden hover:shadow-lg transition-shadow">
    <div className="bg-neutral-900 aspect-square flex items-center justify-center border-b-2 border-gray-900">
      <Mountain className="text-neutral-700 opacity-40" size={64} strokeWidth={3} />
    </div>
    <div className="p-4">
      <h4 className="font-black text-sm md:text-base mb-1 text-gray-900 uppercase tracking-wider">
        Problem #{id}
      </h4>
      <p className="text-xs md:text-sm text-gray-600 font-bold">{grade}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">
          {sends} Sends
        </span>
        <Bookmark 
          size={18} 
          className="text-gray-400 hover:text-blue-500 cursor-pointer" 
          strokeWidth={2.5} 
        />
      </div>
    </div>
  </div>
);

export default ProblemGridCard;
