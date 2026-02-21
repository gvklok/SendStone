import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, Loader2 } from 'lucide-react';
import ProblemGridCard from '../common/ProblemGridCard';
import FullscreenPost from './partials/FullscreenPost';
import { getPrefetchedRoutes, clearPrefetchedRoutes } from '../../routeCache';

const API_BASE = 'http://127.0.0.1:8000';
const PAGE_SIZE = 24;

const ExplorePage = ({ onSave, onSend, savedIds = new Set(), likedIds = new Set(), openPostId, clearOpenPost, onOpenPost }) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);      // initial / filter load
  const [loadingMore, setLoadingMore] = useState(false); // infinite-scroll load
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [openPost, setOpenPost] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const scrollRef = useRef(null);

  // Compute whether there are more pages
  const hasMore = routes.length < total;

  // ── Fetch a page of routes ──────────────────────────────────────
  const fetchPage = useCallback(async (search, difficulty, pageNum, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let url = `${API_BASE}/routes?limit=${PAGE_SIZE}&page=${pageNum}&sort=-send_count`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (difficulty) url += `&difficulty=v${difficulty}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const data = await res.json();
      const items = data.items || [];

      if (append) {
        setRoutes(prev => {
          // Deduplicate by ID
          const existingIds = new Set(prev.map(r => r.id));
          const newItems = items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setRoutes(items);
      }
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Initial fetch — use prefetched cache if available ──────────
  useEffect(() => {
    const cached = getPrefetchedRoutes();
    if (cached) {
      setRoutes(cached.items);
      setTotal(cached.total);
      setLoading(false);
      clearPrefetchedRoutes();
    } else {
      setPage(1);
      fetchPage('', '', 1, false);
    }
  }, [fetchPage]);

  // ── Re-fetch when filters change ───────────────────────────────
  useEffect(() => {
    setPage(1);
    fetchPage(activeSearch, difficultyFilter, 1, false);
  }, [difficultyFilter, activeSearch, fetchPage]);

  // ── Search submit ──────────────────────────────────────────────
  const handleSearch = () => {
    setActiveSearch(searchInput);
    // useEffect on activeSearch will trigger fetchPage
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ── Load next page ─────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(activeSearch, difficultyFilter, next, true);
  }, [loadingMore, hasMore, page, activeSearch, difficultyFilter, fetchPage]);

  // ── Infinite scroll listener ───────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      // Fire when within 400px of the bottom
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
        loadMore();
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  // ── Map backend → frontend format ──────────────────────────────
  const mappedRoutes = useMemo(() => {
    return routes.map(route => ({
      id: route.id,
      name: route.name,
      grade: route.difficulty?.toUpperCase() || 'V0',
      sends: route.send_count || 0,
      holds: route.holds || [],
      angle: route.angle,
      description: route.description,
      createdAt: route.created_at,
    }));
  }, [routes]);

  // Handle opening a post from external link
  useEffect(() => {
    if (!openPostId) return;
    const found = mappedRoutes.find((p) => p.id === openPostId);
    if (found) {
      setOpenPost(found);
      onOpenPost?.(found.id);
    }
    clearOpenPost?.();
  }, [openPostId, mappedRoutes, onOpenPost, clearOpenPost]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-wider">
              Explore
            </h2>
            <button
              onClick={() => { setPage(1); fetchPage(activeSearch, difficultyFilter, 1, false); }}
              disabled={loading}
              className="p-2 rounded-full bg-white border-2 border-gray-900 hover:bg-gray-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Search */}
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
                placeholder="Search by name... (press Enter)"
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

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All Grades</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => (
                <option key={v} value={v}>V{v}</option>
              ))}
            </select>
            {activeSearch && (
              <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                Search: "{activeSearch}"
                <button onClick={() => { setSearchInput(''); setActiveSearch(''); }} className="ml-2 text-red-500">✕</button>
              </span>
            )}
            <span className="text-xs font-semibold text-gray-500 ml-auto">
              {mappedRoutes.length} of {total} routes
            </span>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-red-600 font-semibold bg-red-50 border-2 border-red-200 p-4 mb-4 rounded">
            Error: {error}
            <button onClick={() => { setPage(1); fetchPage(activeSearch, difficultyFilter, 1, false); }} className="ml-4 underline">Retry</button>
          </div>
        )}

        {/* Initial loading state */}
        {loading && (
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            Loading routes...
          </div>
        )}

        {/* Empty state */}
        {!loading && mappedRoutes.length === 0 && (
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            No routes found. Create one from the Create tab!
          </div>
        )}

        {/* Routes grid */}
        {!loading && mappedRoutes.length > 0 && (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6">
            {mappedRoutes.map(({ id, grade, sends, name, holds }) => (
              <ProblemGridCard
                key={id}
                id={id}
                grade={grade}
                sends={sends}
                name={name}
                holds={holds}
                saved={savedIds.has(id)}
                liked={likedIds.has(id)}
                onOpen={() => {
                  const post = mappedRoutes.find((p) => p.id === id);
                  if (post) {
                    setOpenPost(post);
                    onOpenPost?.(post.id);
                  }
                }}
                onBookmark={() => onSave?.(id)}
                onHeart={() => onSend?.(id)}
              />
            ))}
          </div>
        )}

        {/* Loading more spinner */}
        {loadingMore && (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-semibold uppercase tracking-widest">Loading more...</span>
          </div>
        )}

        {/* End of results */}
        {!loading && !loadingMore && !hasMore && mappedRoutes.length > 0 && (
          <div className="text-center py-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            All {total} routes loaded
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
          saved={savedIds.has(openPost.id)}
        />
      )}
    </div>
  );
};

export default ExplorePage;
