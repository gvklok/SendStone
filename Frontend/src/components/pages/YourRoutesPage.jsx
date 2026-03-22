import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import ProblemGridCard from '../common/ProblemGridCard';
import FullscreenPost from './partials/FullscreenPost';

const API_BASE = process.env.REACT_APP_API_URL;
const PAGE_SIZE = 12;

const YourRoutesPage = ({ user, onSave, onSend, savedIds = new Set(), likedIds = new Set(), onOpenPost }) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [openPost, setOpenPost] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const hasMountedFilterEffect = useRef(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const fetchPage = useCallback(
    async (search, difficulty, pageNum) => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);

      try {
        let url = `${API_BASE}/routes?limit=${PAGE_SIZE}&page=${pageNum}&sort=-created_at&creator_id=${encodeURIComponent(user.id)}&include_private=true`;
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
        if (difficulty) url += `&difficulty=v${difficulty}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

        const data = await res.json();
        setRoutes(data.items || []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error('Error fetching your routes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) {
      setRoutes([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setPage(1);
    fetchPage('', '', 1);
  }, [fetchPage, user?.id]);

  useEffect(() => {
    if (!hasMountedFilterEffect.current) {
      hasMountedFilterEffect.current = true;
      return;
    }
    setPage(1);
    fetchPage(activeSearch, difficultyFilter, 1);
  }, [difficultyFilter, activeSearch, fetchPage]);

  const handleSearch = () => {
    setActiveSearch(searchInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const goToPage = useCallback(
    (nextPage) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
      setPage(nextPage);
      fetchPage(activeSearch, difficultyFilter, nextPage);
    },
    [totalPages, page, fetchPage, activeSearch, difficultyFilter]
  );

  const visiblePages = useMemo(() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [page, totalPages]);

  const mappedRoutes = useMemo(() => {
    return routes.map((route) => {
      const apiUsername = route.author_username || route.authorUsername || route.setter_username || null;
      const resolvedUsername =
        apiUsername && apiUsername !== 'climber'
          ? apiUsername
          : (user?.username || (user?.email ? user.email.split('@')[0] : 'climber'));

      return {
        id: route.id,
        name: route.name,
        grade: route.difficulty?.toUpperCase() || 'V0',
        sends: route.send_count || 0,
        holds: route.holds || [],
        angle: route.angle,
        description: route.description,
        authorUsername: resolvedUsername,
        createdAt: route.created_at,
      };
    });
  }, [routes, user?.username, user?.email]);

  const filteredRoutes = useMemo(() => {
    return mappedRoutes.filter((route) => {
      const ascended = likedIds.has(route.id) || likedIds.has(String(route.id));
      if (completionFilter === 'ascended') return ascended;
      if (completionFilter === 'not_ascended') return !ascended;
      return true;
    });
  }, [mappedRoutes, likedIds, completionFilter]);

  const PaginationNav = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-gray-200 rounded-xl px-3 py-2">
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Showing {pageStart}-{pageEnd} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={loading || page === 1}
          className="px-3 py-1.5 text-xs font-bold uppercase border border-gray-300 rounded-md bg-white disabled:opacity-40"
        >
          Prev
        </button>
        {visiblePages.map((p) => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            disabled={loading}
            className={`px-3 py-1.5 text-xs font-bold border rounded-md ${
              p === page
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => goToPage(page + 1)}
          disabled={loading || page === totalPages}
          className="px-3 py-1.5 text-xs font-bold uppercase border border-gray-300 rounded-md bg-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            Log in to view your routes.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-wider">Your Routes</h2>
            <button
              onClick={() => fetchPage(activeSearch, difficultyFilter, page)}
              disabled={loading}
              className="p-2 rounded-full bg-white border-2 border-gray-900 hover:bg-gray-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} strokeWidth={2.5} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name..."
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button onClick={handleSearch} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700">
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
              <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-700" strokeWidth={2.4} />
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
              <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-700" strokeWidth={2.4} />
            </div>

            {activeSearch && (
              <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                Search: "{activeSearch}"
                <button onClick={() => { setSearchInput(''); setActiveSearch(''); }} className="ml-2 text-red-500">
                  X
                </button>
              </span>
            )}
            <span className="text-xs font-semibold text-gray-500 ml-auto">Page {page} of {totalPages}</span>
          </div>
        </div>

        {error && (
          <div className="text-red-600 font-semibold bg-red-50 border-2 border-red-200 p-4 mb-4 rounded">
            Error: {error}
            <button onClick={() => fetchPage(activeSearch, difficultyFilter, page)} className="ml-4 underline">
              Retry
            </button>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="mb-4">
            <PaginationNav />
          </div>
        )}

        {loading && (
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            Loading your routes...
          </div>
        )}

        {!loading && filteredRoutes.length === 0 && (
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            You have not posted any routes yet.
          </div>
        )}

        {!loading && filteredRoutes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredRoutes.map(({ id, grade, sends, name, holds, authorUsername }) => (
              <ProblemGridCard
                key={id}
                id={id}
                grade={grade}
                sends={sends}
                name={name}
                holds={holds}
                authorUsername={authorUsername}
                saved={savedIds.has(id) || savedIds.has(String(id))}
                liked={likedIds.has(id)}
                onOpen={() => {
                  const post = mappedRoutes.find((p) => p.id === id);
                  if (post) {
                    setOpenPost(post);
                    onOpenPost?.(post);
                  }
                }}
                onBookmark={() => onSave?.(id)}
                onHeart={async () => {
                  const result = await onSend?.(id);
                  if (result && typeof result.sendCount === 'number') {
                    setRoutes((prev) =>
                      prev.map((r) => (String(r.id) === String(id) ? { ...r, send_count: result.sendCount } : r))
                    );
                    setOpenPost((prev) =>
                      prev && String(prev.id) === String(id) ? { ...prev, sends: result.sendCount } : prev
                    );
                  }
                }}
              />
            ))}
          </div>
        )}

        {!loading && total > 0 && (
          <div className="mt-6">
            <PaginationNav />
          </div>
        )}
      </div>

      {openPost && (
        <FullscreenPost
          post={openPost}
          onClose={() => setOpenPost(null)}
          onSave={() => onSave?.(openPost.id)}
          onSend={async () => {
            const result = await onSend?.(openPost.id);
            if (result && typeof result.sendCount === 'number') {
              setRoutes((prev) =>
                prev.map((r) =>
                  String(r.id) === String(openPost.id) ? { ...r, send_count: result.sendCount } : r
                )
              );
              setOpenPost((prev) => (prev ? { ...prev, sends: result.sendCount } : prev));
            }
          }}
          liked={likedIds.has(openPost.id)}
          saved={savedIds.has(openPost.id)}
        />
      )}
    </div>
  );
};

export default YourRoutesPage;
