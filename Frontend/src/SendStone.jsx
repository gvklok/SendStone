import React, { useEffect, useState } from 'react';
import Navigation from './components/layout/Navigation';
import Header from './components/layout/Header';
import MobileMenu from './components/layout/MobileMenu';
import MobileBottomNav from './components/layout/MobileBottomNav';
import HomePage from './components/pages/HomePage';
import CreatePage from './components/pages/CreatePage';
import ExplorePage from './components/pages/ExplorePage';
import SavedPage from './components/pages/SavedPage';
import ProfilePage from './components/pages/ProfilePage';
import AuthModal from './components/common/AuthModal';
import { supabase } from './supabaseClient';

// Kick off background prefetch of popular routes on app boot
import './routeCache';

export default function ClimbingBoardApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [publicProblems, setPublicProblems] = useState([]);
  const [savedProblems, setSavedProblems] = useState([]);
  const [likedProblems, setLikedProblems] = useState([]);
  const [recentOpenedIds, setRecentOpenedIds] = useState([]);
  const [openPostId, setOpenPostId] = useState(null);

  const restrictedTabs = ['create', 'profile', 'saved'];

  // Sync user profile to profiles table via backend API
  const syncProfileToDatabase = async (userId, userData) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/profiles', {
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
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const supaUser = session.user;
        const userData = {
          email: supaUser.email,
          name: supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || supaUser.email.split('@')[0],
          username: supaUser.user_metadata?.username || supaUser.email.split('@')[0],
          climbingLevel: supaUser.user_metadata?.climbingLevel || 'beginner',
          photoData: supaUser.user_metadata?.photoData || supaUser.user_metadata?.avatar_url || null,
        };
        setUser(userData);
        // Sync to profiles table
        syncProfileToDatabase(supaUser.id, userData);
      } else {
        setUser(null);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && _event !== 'SIGNED_OUT') {
        const supaUser = session.user;
        const userData = {
          email: supaUser.email,
          name: supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || supaUser.email.split('@')[0],
          username: supaUser.user_metadata?.username || supaUser.email.split('@')[0],
          climbingLevel: supaUser.user_metadata?.climbingLevel || 'beginner',
          photoData: supaUser.user_metadata?.photoData || supaUser.user_metadata?.avatar_url || null,
        };
        setUser(userData);
        // Sync to profiles table (important for OAuth flows)
        syncProfileToDatabase(supaUser.id, userData);
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        setActiveTab('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const storedPublic = JSON.parse(localStorage.getItem('sendstonePublicProblems') || '[]');
      const storedSaved = JSON.parse(localStorage.getItem('sendstoneSavedProblems') || '[]');
      const storedLiked = JSON.parse(localStorage.getItem('sendstoneLikedProblems') || '[]');
      const storedRecent = JSON.parse(localStorage.getItem('sendstoneRecentOpened') || '[]');
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
      setSavedProblems(storedSaved);
      setLikedProblems(storedLiked);
      setRecentOpenedIds(storedRecent);
    } catch (e) {
      setPublicProblems([]);
      setSavedProblems([]);
      setLikedProblems([]);
      setRecentOpenedIds([]);
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
      localStorage.setItem('sendstoneSavedProblems', JSON.stringify(savedProblems));
    } catch (e) {
      // ignore
    }
  }, [savedProblems]);

  useEffect(() => {
    try {
      localStorage.setItem('sendstoneLikedProblems', JSON.stringify(likedProblems));
    } catch (e) {
      // ignore
    }
  }, [likedProblems]);

  useEffect(() => {
    try {
      localStorage.setItem('sendstoneRecentOpened', JSON.stringify(recentOpenedIds));
    } catch (e) {
      // ignore
    }
  }, [recentOpenedIds]);

  const requestTabChange = (tabName) => {
    if (restrictedTabs.includes(tabName) && !user) {
      setPendingTab(tabName);
      setShowAuth(true);
      return;
    }
    setActiveTab(tabName);
  };

  const handleAuthenticated = (userObj) => {
    setAuthError('');
    // Immediately set user from the auth response
    setUser(userObj);
    setShowAuth(false);
    if (pendingTab) {
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

  const handlePostProblem = async (problem) => {
    if (!user) return;

    try {
      // Post to backend API
      const res = await fetch('http://127.0.0.1:8000/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: problem.name,
          difficulty: problem.difficulty,
          description: problem.description || '',
          holds: problem.holds || [],
          angle: problem.angle || 40,
          visibility: 'public',
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
    } catch (err) {
      console.error('Error posting route:', err);
      alert('Failed to post route. Is the backend running?');
    }
  };

  const handleSaveProblem = (problem) => {
    if (!user) return;
    const newProblem = {
      ...problem,
      id: Date.now(),
      savedDate: new Date().toISOString(),
      userEmail: user.email,
      holds: problem.holds || [],
      authorName: user.name || 'Anonymous',
      authorUsername: user.username || user.email || 'climber',
    };
    setSavedProblems((prev) => [newProblem, ...prev]);
  };

  const handleToggleSaveFromExplore = (problemId) => {
    if (!user) {
      setPendingTab('saved');
      setShowAuth(true);
      return;
    }
    const target = publicProblems.find((p) => p.id === problemId);
    if (!target) return;
    const existing = savedProblems.find((p) => p.userEmail === user.email && p.id === problemId);
    if (existing) {
      setSavedProblems((prev) => prev.filter((p) => !(p.userEmail === user.email && p.id === problemId)));
    } else {
      const newProblem = {
        ...target,
        savedDate: new Date().toISOString(),
        userEmail: user.email,
        authorName: target.authorName,
        authorUsername: target.authorUsername,
      };
      setSavedProblems((prev) => [newProblem, ...prev]);
    }
  };

  const handleSendProblem = (problemId) => {
    if (!user) {
      setPendingTab('explore');
      setShowAuth(true);
      return;
    }
    const likedKey = `${user.email}-${problemId}`;
    const alreadyLiked = likedProblems.includes(likedKey);

    if (alreadyLiked) {
      setLikedProblems((prev) => prev.filter((k) => k !== likedKey));
      setPublicProblems((prev) =>
        prev.map((p) =>
          p.id === problemId ? { ...p, sends: Math.max((p.sends || 1) - 1, 0) } : p
        )
      );
    } else {
      setLikedProblems((prev) => [...prev, likedKey]);
      setPublicProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, sends: (p.sends || 0) + 1 } : p))
      );
    }
  };

  const recordOpenPost = (postId) => {
    setRecentOpenedIds((prev) => [postId, ...prev.filter((id) => id !== postId)].slice(0, 6));
  };

  const recentPosts = recentOpenedIds
    .map((id) => publicProblems.find((p) => p.id === id))
    .filter(Boolean);

  const userSavedProblems = savedProblems.filter((p) => p.userEmail === user?.email);

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Desktop Navigation */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={requestTabChange}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Mobile Header */}
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Mobile Menu Overlay */}
      <MobileMenu 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={requestTabChange}
      />

      {/* Content Area */}
      {activeTab === 'home' && (
        <HomePage
          user={user}
          publicProblems={publicProblems}
          likedProblems={likedProblems}
          recentPosts={recentPosts}
          onOpenRecent={(id) => {
            recordOpenPost(id);
            setOpenPostId(id);
            setActiveTab('explore');
          }}
        />
      )}
      {activeTab === 'create' && <CreatePage user={user} onPostProblem={handlePostProblem} onSaveProblem={handleSaveProblem} />}
      {activeTab === 'explore' && (
        <ExplorePage
          problems={publicProblems}
          onSave={handleToggleSaveFromExplore}
          onSend={handleSendProblem}
          savedIds={new Set(userSavedProblems.map((p) => p.id))}
          likedIds={
            user
              ? new Set(
                  likedProblems
                    .filter((k) => k.startsWith(`${user.email}-`))
                    .map((k) => Number(k.split('-')[1]))
                )
              : new Set()
          }
          openPostId={openPostId}
          clearOpenPost={() => setOpenPostId(null)}
          onOpenPost={recordOpenPost}
        />
      )}
      {activeTab === 'saved' && <SavedPage savedProblems={userSavedProblems} />}
      {activeTab === 'profile' && <ProfilePage user={user} onSignOut={handleSignOut} />}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={requestTabChange} />

      <AuthModal 
        open={showAuth} 
        onClose={() => setShowAuth(false)} 
        onAuthenticated={handleAuthenticated}
        targetTab={pendingTab}
        externalError={authError}
      />
    </div>
  );
}
