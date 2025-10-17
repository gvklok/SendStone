import React from 'react';
import { Mountain } from 'lucide-react';

const ProblemCard = ({ id, grade, setter, status }) => (
  <div className="bg-white border-2 border-gray-900 p-5 md:p-6 border-l-4 border-l-blue-500">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-black text-gray-900 uppercase tracking-wider text-base md:text-lg">
          Problem #{id}
        </h4>
        <p className="text-sm md:text-base text-gray-600 font-bold mt-1">Grade: {grade}</p>
      </div>
      {status && (
        <span className="bg-gray-900 text-neutral-100 text-xs px-3 py-1 font-black uppercase tracking-wider">
          {status}
        </span>
      )}
    </div>
    {setter && (
      <div className="mt-3 text-sm text-gray-500 font-semibold">
        Set by: {setter}
      </div>
    )}
  </div>
);

export default ProblemCard;
