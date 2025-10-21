import React from 'react';
import InteractiveBoard from '../common/InteractiveBoard';

const CreatePage = () => (
  <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-black mb-6 md:mb-10 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
        Create Problem
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Interactive Board */}
        <InteractiveBoard />

        {/* Problem Details Form */}
        <div className="space-y-5 md:space-y-6">
          <div>
            <label className="block text-sm md:text-base font-black mb-2 text-gray-900 uppercase tracking-wider">
              Problem Name
            </label>
            <input
              type="text"
              placeholder="ENTER PROBLEM NAME"
              className="w-full px-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm md:text-base font-black mb-2 text-gray-900 uppercase tracking-wider">
              Grade
            </label>
            <select className="w-full px-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold focus:outline-none focus:border-blue-500">
              <option>SELECT GRADE...</option>
              {['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10'].map(grade => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm md:text-base font-black mb-2 text-gray-900 uppercase tracking-wider">
              Description
            </label>
            <textarea
              placeholder="ADD NOTES OR BETA..."
              className="w-full px-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500 h-32"
            />
          </div>

          <button className="w-full bg-gray-900 text-neutral-100 py-4 md:py-5 font-black uppercase tracking-widest hover:bg-gray-800 transition-colors border-2 border-gray-900">
            Save Problem
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default CreatePage;
