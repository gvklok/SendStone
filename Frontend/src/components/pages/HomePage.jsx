import React, { useEffect, useMemo, useState } from 'react';
import { Mountain, TrendingUp, Award, Clock } from 'lucide-react';
import StatCard from '../common/StatCard';
import ProblemCard from '../common/ProblemCard';

const heroImages = [
  '/climbing-1.jpeg',
  '/climbing-2.jpeg',
  '/climbing-3.jpeg',
  '/climbing-4.jpeg',
];

const HomePage = ({ user, publicProblems = [], likedProblems = [], recentPosts = [], onOpenRecent }) => {
  const [heroIndex, setHeroIndex] = useState(0);

  const userPostCount = useMemo(() => {
    if (!user) return 0;
    return publicProblems.filter((p) => p.userEmail === user.email).length;
  }, [publicProblems, user]);

  const userSendCount = useMemo(() => {
    if (!user) return 0;
    const keyPrefix = `${user.email}-`;
    return likedProblems.filter((k) => k.startsWith(keyPrefix)).length;
  }, [likedProblems, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
      {/* Hero Section with scrolling background */}
      <div className="relative bg-neutral-900 text-neutral-100 p-8 md:p-16 text-center overflow-hidden">
        <div className="absolute inset-0">
          {heroImages.map((src, i) => (
            <div
              key={src}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 hero-pan ${
                heroIndex === i ? 'opacity-70' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/65 to-black/80" />
        </div>

        <div className="relative max-w-4xl mx-auto z-10">
          <div className="inline-block p-6 md:p-8 mb-6 bg-black/20 rounded-full">
            <Mountain size={80} className="md:w-32 md:h-32" strokeWidth={3} />
          </div>
          <h1 className="text-4xl md:text-7xl font-black mb-3 uppercase tracking-widest">Welcome To</h1>
          <h2 className="text-5xl md:text-8xl font-black tracking-widest">SendStone</h2>
          <p className="mt-6 text-neutral-200 font-bold uppercase text-sm md:text-lg tracking-widest">
            Climb. Track. Conquer.
          </p>
        </div>
      </div>

      {/* Quick Stats or Team */}
      {user ? (
        <div className="grid grid-cols-3 gap-4 md:gap-8 p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
          <StatCard icon={TrendingUp} value={userPostCount} label="Problems" />
          <StatCard icon={Award} value={userSendCount} label="Sends" />
          <StatCard icon={Clock} value="0" label="Sessions" />
        </div>
      ) : null}

      {/* About or Recent Problems */}
      {user ? (
        <div className="p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
          <h3 className="text-2xl md:text-4xl font-black mb-5 md:mb-8 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
            Recent Problems
          </h3>
          {recentPosts.length === 0 ? (
            <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
              Open a problem on Explore to see it here.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPosts.map((p) => (
                <div
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => onOpenRecent?.(p.id)}
                >
                  <ProblemCard 
                    id={p.id}
                    grade={p.grade}
                    setter={p.name}
                    status="Open"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="p-6 md:p-12 bg-neutral-100 max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-4xl font-black mb-4 md:mb-6 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
              About SendStone
            </h3>
            <p className="text-base md:text-lg text-gray-700 font-semibold leading-relaxed bg-white border-2 border-gray-200 p-6">
              SendStone is a research capstone project to prototype an end-to-end experience for a mini LED climbing board: design problems on a digital grid, preview the LEDs, and mock-send patterns to a board.
            </p>
          </div>

          <div className="p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
            <h3 className="text-2xl md:text-4xl font-black mb-4 md:mb-6 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
              Meet the Founders
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Gabe', role: 'Founder & Hardware Engineer' },
                { name: 'Chloe', role: 'Database Engineer' },
                { name: 'Ryan', role: 'Website Dev. Engineer' },
                { name: 'Uriah', role: 'Security Administrator' },
              ].map(({ name, role }) => (
                <div key={name} className="bg-white border-2 border-gray-900 p-6 text-center">
                  <div className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-wider mb-2">
                    {name}
                  </div>
                  <div className="text-sm md:text-base text-gray-600 font-semibold">
                    {role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;
