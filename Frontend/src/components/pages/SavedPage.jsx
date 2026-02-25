import React, { useMemo, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import ProblemGridCard from '../common/ProblemGridCard';
import FullscreenPost from './partials/FullscreenPost';

const SavedPage = ({ savedProblems = [], onSend, onSave, likedIds = new Set(), onOpenPost }) => {
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [openPost, setOpenPost] = useState(null);

  const handleSearch = () => setActiveSearch(searchInput.trim());
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const filtered = useMemo(() => {
    return savedProblems.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const searchPass = !activeSearch || name.includes(activeSearch.toLowerCase());
      const gradePass =
        !difficultyFilter ||
        String(p.grade || '').toUpperCase() === `V${difficultyFilter}`;
      const ascended = likedIds.has(p.id) || likedIds.has(String(p.id));
      const completionPass =
        completionFilter === 'all'
          ? true
          : completionFilter === 'ascended'
            ? ascended
            : !ascended;
      return searchPass && gradePass && completionPass;
    });
  }, [savedProblems, activeSearch, difficultyFilter, completionFilter, likedIds]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 md:mb-10">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
            Saved Problems
          </h2>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                size={20}
                strokeWidth={2.5}
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name..."
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 rounded-full border border-gray-200 bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Grades</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => (
                  <option key={v} value={v}>V{v}</option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-700"
                strokeWidth={2.4}
              />
            </div>
            <div className="relative">
              <select
                value={completionFilter}
                onChange={(e) => setCompletionFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 rounded-full border border-gray-200 bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All</option>
                <option value="ascended">Ascended</option>
                <option value="not_ascended">Not Ascended</option>
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-700"
                strokeWidth={2.4}
              />
            </div>

            {activeSearch && (
              <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                Search: "{activeSearch}"
                <button
                  onClick={() => {
                    setSearchInput('');
                    setActiveSearch('');
                  }}
                  className="ml-2 text-red-500"
                >
                  X
                </button>
              </span>
            )}
            <span className="text-xs font-semibold text-gray-500 ml-auto">
              {filtered.length} saved routes
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            No saved problems match your filters.
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setOpenPost(p);
                  onOpenPost?.(p);
                }}
                className="cursor-pointer"
              >
                <ProblemGridCard
                  id={p.id}
                  grade={p.grade}
                  name={p.name}
                  sends={p.sends || 0}
                  holds={p.holds}
                  authorUsername={p.authorUsername}
                  liked={likedIds.has(p.id) || likedIds.has(String(p.id))}
                  saved
                  onBookmark={(e) => {
                    e?.stopPropagation?.();
                    onSave?.(p.id);
                  }}
                  onHeart={(e) => {
                    e?.stopPropagation?.();
                    onSend?.(p.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {openPost && (
        <FullscreenPost
          post={openPost}
          onClose={() => setOpenPost(null)}
          onSave={() => onSave?.(openPost.id)}
          onSend={() => onSend?.(openPost.id)}
          liked={likedIds.has(openPost.id)}
          saved
        />
      )}
    </div>
  );
};

export default SavedPage;
