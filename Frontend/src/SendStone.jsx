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

  const loadPhotoForEmail = (email) => {
    if (!email) return null;
    return localStorage.getItem(`sendstoneUserPhoto_${email}`) || null;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('sendstoneUser');
    if (!savedUser) return;
    try {
      const parsed = JSON.parse(savedUser);
      const photoData = loadPhotoForEmail(parsed.email) || parsed.photoData || null;
      setUser({ ...parsed, photoData });
    } catch (e) {
      // ignore parse errors
    }
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

    const MAX_PHOTO_BYTES = 200 * 1024;
    const estimateB64Bytes = (dataUrl) => {
      if (!dataUrl) return 0;
      const base = dataUrl.split(',')[1] || '';
      return Math.floor(base.length * 0.75);
    };

    const safeUser = { ...userObj };
    const photoData = safeUser.photoData;
    if (photoData && estimateB64Bytes(photoData) > MAX_PHOTO_BYTES) {
      safeUser.photoData = null; // drop oversized photo to avoid quota errors
    }

    const persistPhoto = () => {
      if (!safeUser.email) return true;
      try {
        if (safeUser.photoData) {
          localStorage.setItem(`sendstoneUserPhoto_${safeUser.email}`, safeUser.photoData);
        } else {
          localStorage.removeItem(`sendstoneUserPhoto_${safeUser.email}`);
        }
        return true;
      } catch (e) {
        return false;
      }
    };

    const persistCurrentUser = (obj) => {
      const minimal = { ...obj, photoData: undefined };
      try {
        localStorage.setItem('sendstoneUser', JSON.stringify(minimal));
        return true;
      } catch (e) {
        return false;
      }
    };

    const persistUserList = (obj) => {
      try {
        const storedUsers = JSON.parse(localStorage.getItem('sendstoneUsers') || '[]');
        const updated = [
          ...storedUsers.filter((u) => u.email !== obj.email),
          { ...obj, photoData: undefined },
        ];
        localStorage.setItem('sendstoneUsers', JSON.stringify(updated));
        return true;
      } catch (e) {
        return false;
      }
    };

    // try with current data, then without photo if needed
    if (!persistPhoto() || !persistCurrentUser(safeUser) || !persistUserList(safeUser)) {
      safeUser.photoData = null;
      if (!persistPhoto() || !persistCurrentUser(safeUser) || !persistUserList(safeUser)) {
        setAuthError('Storage is full. Clear site data or upload a smaller photo.');
        setShowAuth(true);
        return;
      }
    }

    setUser({ ...safeUser, photoData: photoData || safeUser.photoData || null });
    setShowAuth(false);
    setActiveTab(pendingTab || activeTab);
    setPendingTab(null);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('sendstoneUser');
    setActiveTab('home');
  };

  const handlePostProblem = (problem) => {
    if (!user) return;
    const newProblem = {
      ...problem,
      id: Date.now(),
      sends: problem.sends || 0,
      holds: problem.holds || [],
      authorName: user.name || 'Anonymous',
      authorUsername: user.username || user.email || 'climber',
    };
    setPublicProblems((prev) => [newProblem, ...prev]);
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
