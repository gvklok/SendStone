import React, { useEffect, useRef, useState } from 'react';
import Navigation from './components/layout/Navigation';
import MobileBottomNav from './components/layout/MobileBottomNav';
import HomePage from './components/pages/HomePage';
import CreatePage from './components/pages/CreatePage';
import ExplorePage from './components/pages/ExplorePage';
import SavedPage from './components/pages/SavedPage';
import ProfilePage from './components/pages/ProfilePage';
import YourRoutesPage from './components/pages/YourRoutesPage';
import AuthModal from './components/common/AuthModal';
import { Mountain, X } from 'lucide-react';
import { supabase } from './supabaseClient';

// Kick off background prefetch of popular routes on app boot
import './routeCache';

const API_BASE = process.env.REACT_APP_API_URL;

const LOGIN_POPUP_SESSION_KEY = 'sendstone_login_popup_shown';
const LOGIN_SESSION_COUNTED_KEY = 'sendstone_login_session_counted';
const THEME_STORAGE_KEY = 'sendstone_theme';
const SIDEBAR_PINNED_KEY = 'sendstone_sidebar_pinned';
const TEXT_SIZE_STORAGE_KEY = 'sendstone_text_size';

export default function ClimbingBoardApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [theme, setTheme] = useState('light');
  const [textSize, setTextSize] = useState('small');
  const [showAuth, setShowAuth] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authStatusPopup, setAuthStatusPopup] = useState(null);
  const [publicProblems, setPublicProblems] = useState([]);
  const [savedProblems, setSavedProblems] = useState([]);
  const [likedProblems, setLikedProblems] = useState([]);
  const [recentOpenedIds, setRecentOpenedIds] = useState([]);
  const [recentOpenedPosts, setRecentOpenedPosts] = useState([]);
  const [openPostId, setOpenPostId] = useState(null);
  const [remixData, setRemixData] = useState(null);
  const [pendingRemixPost, setPendingRemixPost] = useState(null);
  const [createPageKey, setCreatePageKey] = useState(0);
  const [dashboardStats, setDashboardStats] = useState({
    problems_created: null,
    successful_ascensions: null,
    sessions: null,
    max_grade: null,
    saved_climbs: null,
    community_ascensions: null,
  });
  const hasActiveLoginSessionRef = useRef(false);
  const hydrateRetryTimerRef = useRef(null);

  const restrictedTabs = ['profile', 'saved', 'yourRoutes'];
  const normalizeUiSettings = (settings) => {
    if (!settings || typeof settings !== 'object') return null;
    return {
      theme: settings.theme === 'dark' ? 'dark' : 'light',
      sidebarPinned: settings.sidebarPinned === true,
      textSize: settings.textSize === 'large' ? 'large' : 'small',
    };
  };
  const applyUiSettings = (settings) => {
    const normalized = normalizeUiSettings(settings);
    if (!normalized) return;
    setTheme(normalized.theme);
    setSidebarPinned(normalized.sidebarPinned);
    setTextSize(normalized.textSize);
    setSidebarOpen(normalized.sidebarPinned);
  };
  const persistUiSettingsToAccount = async (nextSettings) => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.auth.getUser();
      const currentMetadata = data?.user?.user_metadata || {};
      await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          ui_settings: {
            theme: nextSettings.theme,
            sidebarPinned: nextSettings.sidebarPinned,
            textSize: nextSettings.textSize,
          },
        },
      });
    } catch (error) {
      console.error('Failed to persist user UI settings:', error);
    }
  };
  const updateUiSettings = (partial) => {
    const nextSettings = {
      theme,
      sidebarPinned,
      textSize,
      ...partial,
    };
    applyUiSettings(nextSettings);
    persistUiSettingsToAccount(nextSettings);
  };
  const hasShownLoginPopupThisSession = () => {
    try {
      return sessionStorage.getItem(LOGIN_POPUP_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  };
  const markLoginPopupShownThisSession = () => {
    try {
      sessionStorage.setItem(LOGIN_POPUP_SESSION_KEY, '1');
    } catch {
      // ignore storage failures
    }
  };
  const clearLoginPopupSessionMarker = () => {
    try {
      sessionStorage.removeItem(LOGIN_POPUP_SESSION_KEY);
    } catch {
      // ignore storage failures
    }
  };
  const hasCountedCurrentSession = () => {
    try {
      return sessionStorage.getItem(LOGIN_SESSION_COUNTED_KEY) === '1';
    } catch {
      return false;
    }
  };
  const markCurrentSessionCounted = () => {
    try {
      sessionStorage.setItem(LOGIN_SESSION_COUNTED_KEY, '1');
    } catch {
      // ignore
    }
  };
  const clearCurrentSessionCounted = () => {
    try {
      sessionStorage.removeItem(LOGIN_SESSION_COUNTED_KEY);
    } catch {
      // ignore
    }
  };
  const fetchDashboardStats = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(userId)}/dashboard`);
      if (!res.ok) throw new Error(`Failed stats fetch: ${res.status}`);
      const data = await res.json();
      setDashboardStats({
        problems_created: data.problems_created ?? 0,
        successful_ascensions: data.successful_ascensions ?? 0,
        sessions: data.sessions ?? 0,
        max_grade: data.max_grade ?? '-',
        saved_climbs: data.saved_climbs ?? 0,
        community_ascensions: data.community_ascensions ?? 0,
      });
    } catch (error) {
      setDashboardStats({
        problems_created: 0,
        successful_ascensions: 0,
        sessions: 0,
        max_grade: '-',
        saved_climbs: 0,
        community_ascensions: 0,
      });
    }
  };
  const logLoginSession = async (userId) => {
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/profiles/${encodeURIComponent(userId)}/sessions`, {
        method: 'POST',
      });
    } catch {
      // ignore logging failures
    }
  };
  const hydrateUserEngagement = async (userData, attempt = 0) => {
    if (!userData?.id || !userData?.email) return;
    try {
      const [savedRes, sentRes] = await Promise.all([
        fetch(`${API_BASE}/routes/meta/saved?user_id=${encodeURIComponent(userData.id)}`),
        fetch(`${API_BASE}/routes/meta/sent_ids?user_id=${encodeURIComponent(userData.id)}`),
      ]);

      if (savedRes.ok) {
        const savedData = await savedRes.json();
        const savedItems = (savedData.items || []).map((route) => ({
          id: route.id,
          name: route.name,
          grade: route.difficulty?.toUpperCase() || 'V0',
          sends: route.send_count || 0,
          holds: route.holds || [],
          angle: route.angle,
          description: route.description || '',
          savedDate: route.saved_at || new Date().toISOString(),
          userEmail: userData.email,
          authorName: route.author_name || 'Anonymous',
          authorUsername:
            route.author_username ||
            route.authorUsername ||
            route.setter_username ||
            route.username ||
            'climber',
        }));
        setSavedProblems((prev) => {
          const others = prev.filter((p) => p.userEmail !== userData.email);
          return [...savedItems, ...others];
        });
      }

      if (sentRes.ok) {
        const sentData = await sentRes.json();
        const sentIds = (sentData.route_ids || []).map((id) => `${userData.email}::${String(id)}`);
        setLikedProblems((prev) => {
          const modernPrefix = `${userData.email}::`;
          const legacyPrefix = `${userData.email}-`;
          const others = prev.filter(
            (k) => !k.startsWith(modernPrefix) && !k.startsWith(legacyPrefix)
          );
          return [...others, ...sentIds];
        });
      }
    } catch (error) {
      if (attempt < 3 && hasActiveLoginSessionRef.current) {
        const delay = (attempt + 1) * 2000; // 2s, 4s, 6s
        hydrateRetryTimerRef.current = setTimeout(() => hydrateUserEngagement(userData, attempt + 1), delay);
      } else if (attempt >= 3) {
        console.error('Failed to hydrate user engagement:', error);
      }
    }
  };
  // Sync user profile to profiles table via backend API
  const syncProfileToDatabase = async (userId, userData) => {
    try {
      const response = await fetch(`${API_BASE}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          email: userData.email,
          name: userData.name,
          username: userData.username,
          photo_url: userData.photoData,
          climber_level: userData.climbingLevel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error syncing profile to database:', error);
      } else {
        const profile = await response.json();
        console.log('Profile synced successfully:', profile);
      }
    } catch (err) {
      console.error('Failed to sync profile:', err);
    }
  };

  // Listen for Supabase auth state changes (handles OAuth callback)
  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const toUserData = (supaUser) => ({
      id: supaUser.id,
      email: supaUser.email,
      name: supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || supaUser.email.split('@')[0],
      username: supaUser.user_metadata?.username || supaUser.email.split('@')[0],
      climbingLevel: supaUser.user_metadata?.climbingLevel || 'beginner',
      photoData: supaUser.user_metadata?.photoData || supaUser.user_metadata?.avatar_url || null,
      uiSettings:
        normalizeUiSettings(supaUser.user_metadata?.ui_settings) ||
        normalizeUiSettings(supaUser.user_metadata?.uiSettings),
    });

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        const supaUser = session.user;
        const userData = toUserData(supaUser);
        setUser(userData);
        if (userData.uiSettings) {
          applyUiSettings(userData.uiSettings);
        }
        if (!hasCountedCurrentSession()) {
          logLoginSession(supaUser.id);
          markCurrentSessionCounted();
        }
        hasActiveLoginSessionRef.current = true;
        syncProfileToDatabase(supaUser.id, userData);
        hydrateUserEngagement(userData);
        fetchDashboardStats(supaUser.id);
      } else {
        setUser(null);
        setSavedProblems([]);
        setLikedProblems([]);
        setDashboardStats({
          problems_created: null,
          successful_ascensions: null,
          sessions: null,
          max_grade: null,
          saved_climbs: null,
          community_ascensions: null,
        });
        hasActiveLoginSessionRef.current = false;
      }

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;

        if (nextSession?.user && _event !== 'SIGNED_OUT') {
          const supaUser = nextSession.user;
          const userData = toUserData(supaUser);
          setUser(userData);
          if (userData.uiSettings) {
            applyUiSettings(userData.uiSettings);
          }

          // Only do full hydration on a fresh SIGNED_IN, not on INITIAL_SESSION
          // or TOKEN_REFRESHED (which fire automatically and would duplicate work
          // already done in initAuth above).
          if (_event === 'SIGNED_IN' && !hasActiveLoginSessionRef.current) {
            if (!hasShownLoginPopupThisSession()) {
              setAuthStatusPopup('login');
              markLoginPopupShownThisSession();
            }
            if (!hasCountedCurrentSession()) {
              logLoginSession(supaUser.id);
              markCurrentSessionCounted();
            }
            fetchDashboardStats(supaUser.id);
            syncProfileToDatabase(supaUser.id, userData);
            hydrateUserEngagement(userData);
            hasActiveLoginSessionRef.current = true;
          }
          // For TOKEN_REFRESHED / INITIAL_SESSION: user state already set above, nothing else needed
        } else if (_event === 'SIGNED_OUT') {
          setUser(null);
          setSavedProblems([]);
          setLikedProblems([]);
          setDashboardStats({
            problems_created: null,
            successful_ascensions: null,
            sessions: null,
            max_grade: null,
            saved_climbs: null,
            community_ascensions: null,
          });
          hasActiveLoginSessionRef.current = false;
          clearTimeout(hydrateRetryTimerRef.current);
          clearLoginPopupSessionMarker();
          clearCurrentSessionCounted();
          setActiveTab('home');
          setAuthStatusPopup('logout');
        }
      });

      subscription = data.subscription;
    };

    initAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      const storedPinned = localStorage.getItem(SIDEBAR_PINNED_KEY);
      const storedTextSize = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
      setTheme(storedTheme === 'dark' ? 'dark' : 'light');
      setSidebarPinned(storedPinned === null ? true : storedPinned === '1');
      setTextSize(storedTextSize === 'large' ? 'large' : 'small');
      setSidebarOpen(storedPinned === null ? true : storedPinned === '1');
    } catch {
      setTheme('light');
      setSidebarPinned(true);
      setTextSize('small');
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('sendstone-dark');
    } else {
      root.classList.remove('sendstone-dark');
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
    } catch {
      // ignore
    }
    const root = document.documentElement;
    if (textSize === 'large') {
      root.classList.add('sendstone-text-large');
    } else {
      root.classList.remove('sendstone-text-large');
    }
  }, [textSize]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PINNED_KEY, sidebarPinned ? '1' : '0');
    } catch {
      // ignore
    }
    if (sidebarPinned) setSidebarOpen(true);
  }, [sidebarPinned]);

  useEffect(() => {
    try {
      const storedPublic = JSON.parse(localStorage.getItem('sendstonePublicProblems') || '[]');
      const storedRecent = JSON.parse(localStorage.getItem('sendstoneRecentOpened') || '[]');
      const storedRecentPosts = JSON.parse(localStorage.getItem('sendstoneRecentOpenedPosts') || '[]');
      setPublicProblems(
        storedPublic.length
          ? storedPublic
          : [
              { id: 12, grade: 'V6', sends: 83, name: 'Moonwalk' },
              { id: 47, grade: 'V3', sends: 120, name: 'Pocket Party' },
              { id: 5, grade: 'V4', sends: 64, name: 'Sidepull City' },
              { id: 28, grade: 'V8', sends: 42, name: 'Crimp Reaper' },
          ]
      );
      setSavedProblems([]);
      setLikedProblems([]);
      setRecentOpenedIds(storedRecent);
      setRecentOpenedPosts(storedRecentPosts);
    } catch (e) {
      setPublicProblems([]);
      setSavedProblems([]);
      setLikedProblems([]);
      setRecentOpenedIds([]);
      setRecentOpenedPosts([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sendstonePublicProblems', JSON.stringify(publicProblems));
    } catch (e) {
      // ignore
    }
  }, [publicProblems]);

  useEffect(() => {
    try {
      localStorage.setItem('sendstoneRecentOpened', JSON.stringify(recentOpenedIds));
    } catch (e) {
      // ignore
    }
  }, [recentOpenedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('sendstoneRecentOpenedPosts', JSON.stringify(recentOpenedPosts));
    } catch (e) {
      // ignore
    }
  }, [recentOpenedPosts]);

  const requestTabChange = (tabName) => {
    if (restrictedTabs.includes(tabName) && !user) {
      setPendingTab(tabName);
      setShowAuth(true);
      return;
    }
    setActiveTab(tabName);
  };

  const applyRemix = (post, currentUser) => {
    const u = currentUser || user;
    const username = u?.username || u?.email?.split('@')[0] || 'climber';
    setRemixData({
      name: `${post.name} (remixed by ${username})`,
      originalName: post.name,
      grade: post.grade,
      description: post.description || '',
      angle: post.angle ?? 40,
      holds: post.holds || [],
    });
    setCreatePageKey((k) => k + 1);
    setActiveTab('create');
  };

  const handleRemix = (post) => {
    if (!user) {
      setPendingRemixPost(post);
      setPendingTab('create');
      setShowAuth(true);
      return;
    }
    applyRemix(post);
  };

  const handleAuthenticated = (userObj) => {
    setAuthError('');
    setUser(userObj);
    setShowAuth(false);
    if (pendingRemixPost) {
      applyRemix(pendingRemixPost, userObj);
      setPendingRemixPost(null);
      setPendingTab(null);
    } else if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // The auth state change listener will handle clearing user state
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: clear manually if Supabase fails
      setUser(null);
      setActiveTab('home');
    }
  };

  const handleUpdateProfilePhoto = async (file) => {
    if (!user?.id || !file) return { ok: false, error: 'No user or file selected.' };
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(user.id)}/photo`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Upload failed (${res.status})`);

      const newPhoto = data.photo_url || null;
      setUser((prev) => (prev ? { ...prev, photoData: newPhoto } : prev));

      try {
        await supabase.auth.updateUser({
          data: {
            photoData: newPhoto,
            avatar_url: newPhoto,
          },
        });
      } catch {
        // ignore metadata sync failure
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'Failed to update profile photo.' };
    }
  };

  const handleUpdateEmail = async (newEmail) => {
    if (!user?.id) return { ok: false, error: 'Not logged in.' };
    try {
      const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(user.id)}/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Email update failed (${res.status})`);

      setUser((prev) => (prev ? { ...prev, email: data.email || newEmail } : prev));
      return { ok: true, authUpdated: Boolean(data.auth_updated), authError: data.auth_error || null };
    } catch (error) {
      return { ok: false, error: error.message || 'Failed to update email.' };
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return { ok: false, error: 'Not logged in.' };
    try {
      const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(user.id)}/account`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Delete failed (${res.status})`);

      await supabase.auth.signOut();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'Failed to delete account.' };
    }
  };

  const handlePostProblem = async (problem) => {
    if (!user) return;

    try {
      // Post to backend API
      const res = await fetch(`${API_BASE}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: problem.name,
          difficulty: problem.difficulty,
          description: problem.description || '',
          holds: problem.holds || [],
          angle: problem.angle || 40,
          visibility: 'public',
          creator_id: user.id || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Failed to post route:', err);
        alert(`Failed to post: ${err.detail || res.status}`);
        return;
      }

      const newRoute = await res.json();
      console.log('Route posted successfully:', newRoute);

      // Add to local state for immediate UI update
      const newProblem = {
        id: newRoute.id,
        name: newRoute.name,
        grade: newRoute.difficulty?.toUpperCase() || 'V0',
        sends: newRoute.send_count || 0,
        holds: newRoute.holds || [],
        angle: newRoute.angle,
        authorName: user.name || 'Anonymous',
        authorUsername: user.username || user.email || 'climber',
      };
      setPublicProblems((prev) => [newProblem, ...prev]);
      setDashboardStats((prev) => ({
        ...prev,
        problems_created: (prev.problems_created ?? 0) + 1,
        community_ascensions: prev.community_ascensions ?? 0,
      }));
    } catch (err) {
      console.error('Error posting route:', err);
      alert('Failed to post route. Is the backend running?');
    }
  };

  const handleSaveProblem = async (problem) => {
    if (!user) return;

    try {
      const res = await fetch(`${API_BASE}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: problem.name || 'Untitled Problem',
          difficulty: problem.difficulty || 'v0',
          description: problem.description || '',
          holds: problem.holds || [],
          angle: problem.angle || 40,
          visibility: 'private',
          creator_id: user.id || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Failed to save private route:', err);
        alert(`Failed to save route: ${err.detail || res.status}`);
        return;
      }

      console.log('Private route saved successfully:', await res.json());
      setDashboardStats((prev) => ({
        ...prev,
        problems_created: (prev.problems_created ?? 0) + 1,
      }));
    } catch (err) {
      console.error('Error saving private route:', err);
      alert('Failed to save route. Is the backend running?');
    }
  };

  const handleToggleSaveFromExplore = async (problemId) => {
    if (!user) {
      setPendingTab('saved');
      setShowAuth(true);
      return;
    }
    const routeId = String(problemId);
    const existing = savedProblems.find(
      (p) => p.userEmail === user.email && String(p.id) === routeId
    );

    try {
      const endpoint = `${API_BASE}/routes/${encodeURIComponent(routeId)}/save?user_id=${encodeURIComponent(user.id)}`;

      if (existing) {
        const res = await fetch(endpoint, { method: 'DELETE' });
        if (!res.ok) throw new Error(`Failed unsave: ${res.status}`);
        setSavedProblems((prev) =>
          prev.filter((p) => !(p.userEmail === user.email && String(p.id) === routeId))
        );
        setDashboardStats((prev) => ({
          ...prev,
          saved_climbs: Math.max(0, (prev.saved_climbs ?? 1) - 1),
        }));
        return { saved: false };
      }

      const saveRes = await fetch(endpoint, { method: 'PUT' });
      if (!saveRes.ok) throw new Error(`Failed save: ${saveRes.status}`);

      // Use local data — no extra fetch needed
      const routeData = publicProblems.find((p) => String(p.id) === routeId);

      const newProblem = {
        id: routeId,
        name: routeData?.name || 'Route',
        grade: routeData?.grade || routeData?.difficulty?.toUpperCase() || 'V0',
        sends: routeData?.sends ?? routeData?.send_count ?? 0,
        holds: routeData?.holds || [],
        angle: routeData?.angle,
        description: routeData?.description || '',
        savedDate: new Date().toISOString(),
        userEmail: user.email,
        authorName: routeData?.authorName || routeData?.author_name || 'Anonymous',
        authorUsername:
          routeData?.authorUsername ||
          routeData?.author_username ||
          'climber',
      };
      setSavedProblems((prev) => [newProblem, ...prev]);
      setDashboardStats((prev) => ({
        ...prev,
        saved_climbs: (prev.saved_climbs ?? 0) + 1,
      }));
      return { saved: true };
    } catch (error) {
      console.error('Error toggling save:', error);
      alert('Failed to update saved route. Please try again.');
      return null;
    }
  };

  const handleSendProblem = (problemId) => {
    if (!user) {
      setPendingTab('explore');
      setShowAuth(true);
      return;
    }
    const routeId = String(problemId);
    const modernKey = `${user.email}::${routeId}`;
    const legacyKey = `${user.email}-${routeId}`;
    const alreadyLiked = likedProblems.includes(modernKey) || likedProblems.includes(legacyKey);

    const syncSend = async () => {
      try {
        const url = `${API_BASE}/routes/${encodeURIComponent(routeId)}/send?user_id=${encodeURIComponent(user.id)}`;
        const res = await fetch(url, {
          method: alreadyLiked ? 'DELETE' : 'PUT',
        });

        if (!res.ok) {
          throw new Error(`Failed send toggle: ${res.status}`);
        }

        const data = await res.json();
        const sendCount = typeof data.send_count === 'number' ? data.send_count : null;

        if (alreadyLiked) {
          setLikedProblems((prev) => prev.filter((k) => k !== modernKey && k !== legacyKey));
        } else {
          setLikedProblems((prev) => [...prev.filter((k) => k !== legacyKey), modernKey]);
        }

        if (sendCount !== null) {
          setPublicProblems((prev) =>
            prev.map((p) => (String(p.id) === routeId ? { ...p, sends: sendCount } : p))
          );
          setSavedProblems((prev) =>
            prev.map((p) => (String(p.id) === routeId ? { ...p, sends: sendCount } : p))
          );
        }
        // Update stats locally — no re-fetch needed
        setDashboardStats((prev) => ({
          ...prev,
          successful_ascensions: Math.max(
            0,
            (prev.successful_ascensions ?? 0) + (alreadyLiked ? -1 : 1)
          ),
        }));

        return { liked: !alreadyLiked, sendCount };
      } catch (error) {
        console.error('Error toggling send:', error);
        alert('Failed to update ascent. Please try again.');
        return null;
      }
    };

    return syncSend();
  };

  const recordOpenPost = (postOrId) => {
    const openedPost = postOrId && typeof postOrId === 'object' ? postOrId : null;
    const postId = openedPost ? openedPost.id : postOrId;
    if (!postId) return;

    setRecentOpenedIds((prev) => [postId, ...prev.filter((id) => id !== postId)].slice(0, 4));

    setRecentOpenedPosts((prev) => {
      if (openedPost) {
        const normalized = { ...openedPost, id: postId };
        return [normalized, ...prev.filter((p) => p.id !== postId)].slice(0, 4);
      }
      const existing = prev.find((p) => p.id === postId);
      if (existing) {
        return [existing, ...prev.filter((p) => p.id !== postId)].slice(0, 4);
      }
      const fromPublic = publicProblems.find((p) => p.id === postId);
      if (fromPublic) {
        return [fromPublic, ...prev.filter((p) => p.id !== postId)].slice(0, 4);
      }
      return prev;
    });
  };

  const recentPosts = recentOpenedPosts.length
    ? recentOpenedPosts.slice(0, 4)
    : recentOpenedIds
        .map((id) => publicProblems.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, 4);

  const userSavedProblems = savedProblems.filter((p) => p.userEmail === user?.email);
  const userLikedIds = user
    ? new Set(
        likedProblems
          .map((k) => {
            const modernPrefix = `${user.email}::`;
            const legacyPrefix = `${user.email}-`;
            if (k.startsWith(modernPrefix)) return k.slice(modernPrefix.length);
            if (k.startsWith(legacyPrefix)) return k.slice(legacyPrefix.length);
            return null;
          })
          .filter(Boolean)
      )
    : new Set();

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Desktop Navigation */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={requestTabChange}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarPinned={sidebarPinned}
      />

      {/* Content Area */}
      {activeTab === 'home' && (
        <HomePage
          user={user}
          publicProblems={publicProblems}
          dashboardStats={dashboardStats}
          recentPosts={recentPosts}
          onOpenRecent={(id) => {
            recordOpenPost(id);
            setOpenPostId(id);
            setActiveTab('explore');
          }}
          onNavigateToCreate={() => setActiveTab('create')}
        />
      )}
      {activeTab === 'create' && (
        <CreatePage
          key={createPageKey}
          user={user}
          onPostProblem={handlePostProblem}
          onSaveProblem={handleSaveProblem}
          remixData={remixData}
          onRemixConsumed={() => setRemixData(null)}
          onRequireAuth={() => setShowAuth(true)}
        />
      )}
      {activeTab === 'explore' && (
        <ExplorePage
          problems={publicProblems}
          onSave={handleToggleSaveFromExplore}
          onSend={handleSendProblem}
          savedIds={new Set(userSavedProblems.map((p) => String(p.id)))}
          likedIds={userLikedIds}
          openPostId={openPostId}
          clearOpenPost={() => setOpenPostId(null)}
          onOpenPost={recordOpenPost}
          onRemix={handleRemix}
        />
      )}
      {activeTab === 'saved' && (
        <SavedPage
          savedProblems={userSavedProblems}
          user={user}
          onSend={handleSendProblem}
          onSave={handleToggleSaveFromExplore}
          likedIds={userLikedIds}
          onOpenPost={recordOpenPost}
        />
      )}
      {activeTab === 'yourRoutes' && (
        <YourRoutesPage
          user={user}
          onSave={handleToggleSaveFromExplore}
          onSend={handleSendProblem}
          savedIds={new Set(userSavedProblems.map((p) => String(p.id)))}
          likedIds={userLikedIds}
          onOpenPost={recordOpenPost}
        />
      )}
      {activeTab === 'profile' && (
        <ProfilePage
          user={user}
          onSignOut={handleSignOut}
          onUpdateProfilePhoto={handleUpdateProfilePhoto}
          onUpdateEmail={handleUpdateEmail}
          onDeleteAccount={handleDeleteAccount}
          theme={theme}
          onToggleTheme={() =>
            updateUiSettings({ theme: theme === 'dark' ? 'light' : 'dark' })
          }
          textSize={textSize}
          onToggleTextSize={() =>
            updateUiSettings({ textSize: textSize === 'large' ? 'small' : 'large' })
          }
          sidebarPinned={sidebarPinned}
          onToggleSidebarPinned={() =>
            updateUiSettings({ sidebarPinned: !sidebarPinned })
          }
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={requestTabChange} />

      <AuthModal 
        open={showAuth} 
        onClose={() => setShowAuth(false)} 
        onAuthenticated={handleAuthenticated}
        targetTab={pendingTab}
        externalError={authError}
      />

      {authStatusPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
          <div className="relative bg-white border-2 border-gray-900 shadow-2xl w-full h-[85vh] max-w-6xl flex flex-col items-center justify-center gap-6 px-4 md:px-6 text-center">
            <button
              onClick={() => setAuthStatusPopup(null)}
              className="absolute top-4 right-4 p-2 border-2 border-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Close status popup"
            >
              <X size={24} strokeWidth={2.8} />
            </button>
            <Mountain className="sendstone-auth-popup-mountain" size={130} strokeWidth={2.6} />
            <p className="font-black uppercase tracking-wide text-gray-900 text-2xl md:text-4xl leading-tight max-w-none">
              {authStatusPopup === 'login' ? (
                <>
                  <span className="block md:whitespace-nowrap">You have successfully logged in.</span>
                  <span className="block">Get climbing!</span>
                </>
              ) : (
                <>
                  <span className="block md:whitespace-nowrap">You have successfully logged out.</span>
                  <span className="block">See you again soon!</span>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
