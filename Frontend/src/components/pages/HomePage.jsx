import React from 'react';
import { Mountain, TrendingUp, Award, Clock } from 'lucide-react';
import StatCard from '../common/StatCard';
import ProblemCard from '../common/ProblemCard';

const HomePage = () => (
  <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
    {/* Hero Section */}
    <div className="bg-neutral-900 text-neutral-100 p-8 md:p-16 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="border-4 border-blue-500 inline-block p-6 md:p-8 mb-6">
          <Mountain size={80} className="md:w-32 md:h-32" strokeWidth={3} />
        </div>
        <h1 className="text-4xl md:text-7xl font-black mb-3 uppercase tracking-widest">Welcome To</h1>
        <h2 className="text-5xl md:text-8xl font-black tracking-widest">SendStone</h2>
        <p className="mt-6 text-neutral-400 font-bold uppercase text-sm md:text-lg tracking-widest">
          Climb. Track. Conquer.
        </p>
      </div>
    </div>

    {/* Quick Stats */}
    <div className="grid grid-cols-3 gap-4 md:gap-8 p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
      <StatCard icon={TrendingUp} value="0" label="Problems" />
      <StatCard icon={Award} value="0" label="Sends" />
      <StatCard icon={Clock} value="0" label="Sessions" />
    </div>

    {/* Recent Problems */}
    <div className="p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
      <h3 className="text-2xl md:text-4xl font-black mb-5 md:mb-8 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
        Recent Problems
      </h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ProblemCard 
            key={i} 
            id={i} 
            grade={`V${i + 3}`} 
            setter="Setter Name" 
            status="New" 
          />
        ))}
      </div>
    </div>
  </div>
);

export default HomePage;
