import React from 'react';
import { Mountain, TrendingUp, Award, Clock, Trophy, Bookmark, Users } from 'lucide-react';
import StatCard from '../common/StatCard';
import ProblemGridCard from '../common/ProblemGridCard';

const HomePage = ({
  user,
  dashboardStats = {
    problems_created: null,
    successful_ascensions: null,
    sessions: null,
    max_grade: null,
    saved_climbs: null,
    community_ascensions: null,
  },
  recentPosts = [],
  onOpenRecent,
  onNavigateToCreate,
  onNavigateToExplore,
}) => {
  const showLearnTheRopes = !user || dashboardStats.problems_created === 0;

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="bg-black text-neutral-100 p-8 md:p-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block p-6 md:p-8 mb-6">
            <Mountain size={80} className="sendstone-hero-mountain text-neutral-100 md:w-32 md:h-32" strokeWidth={3} />
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
        <div className="p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
          <h3 className="text-2xl md:text-4xl font-black mb-5 md:mb-8 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
            Your Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            <StatCard
              icon={TrendingUp}
              value={dashboardStats.problems_created ?? '...'}
              label="Problems Created"
            />
            <StatCard
              icon={Award}
              value={dashboardStats.successful_ascensions ?? '...'}
              label="Successful Ascensions"
            />
            <StatCard
              icon={Clock}
              value={dashboardStats.sessions ?? '...'}
              label="Sessions"
            />
            <StatCard
              icon={Trophy}
              value={dashboardStats.max_grade ?? '...'}
              label="Max Grade"
            />
            <StatCard
              icon={Bookmark}
              value={dashboardStats.saved_climbs ?? '...'}
              label="Saved Climbs"
            />
            <StatCard
              icon={Users}
              value={dashboardStats.community_ascensions ?? '...'}
              label="Community Ascensions"
            />
          </div>
        </div>
      ) : null}

      {/* About or Recent Problems */}
      {user ? (
        <div className="p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
          {showLearnTheRopes && (
            <div className="mb-8 md:mb-12 bg-white border-2 border-gray-900 p-6 md:p-8 text-center">
              <h3 className="text-2xl md:text-4xl font-black mb-2 text-gray-900 uppercase tracking-wider">
                Learn the Ropes
              </h3>
              <p className="text-base md:text-lg text-gray-600 font-semibold mb-5">
                Create your first problem and check out existing ones!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onNavigateToCreate}
                  className="bg-black text-white font-black uppercase tracking-widest px-8 py-3 hover:bg-gray-800 transition-colors"
                >
                  Go to Create
                </button>
                <button
                  onClick={onNavigateToExplore}
                  className="bg-blue-500 text-white font-black uppercase tracking-widest px-8 py-3 hover:bg-blue-600 transition-colors"
                >
                  Go to Explore
                </button>
              </div>
            </div>
          )}
          <h3 className="text-2xl md:text-4xl font-black mb-5 md:mb-8 text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
            Recent Problems
          </h3>
          {recentPosts.length === 0 ? (
            <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
              Open a problem to see it here.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {recentPosts.map((p) => (
                <ProblemGridCard
                  key={p.id}
                  id={p.id}
                  grade={p.grade}
                  sends={p.sends || 0}
                  name={p.name}
                  holds={p.holds || []}
                  authorUsername={p.authorUsername}
                  onOpen={() => onOpenRecent?.(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="p-6 md:p-12 bg-neutral-100 max-w-4xl mx-auto">
            <div className="mb-8 md:mb-12 bg-white border-2 border-gray-900 p-6 md:p-8 text-center">
              <h3 className="text-2xl md:text-4xl font-black mb-2 text-gray-900 uppercase tracking-wider">
                Learn the Ropes
              </h3>
              <p className="text-base md:text-lg text-gray-600 font-semibold mb-5">
                Create your first problem and check out existing ones!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onNavigateToCreate}
                  className="bg-black text-white font-black uppercase tracking-widest px-8 py-3 hover:bg-gray-800 transition-colors"
                >
                  Go to Create
                </button>
                <button
                  onClick={onNavigateToExplore}
                  className="bg-blue-500 text-white font-black uppercase tracking-widest px-8 py-3 hover:bg-blue-600 transition-colors"
                >
                  Go to Explore
                </button>
              </div>
            </div>
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
