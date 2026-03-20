import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

const API_BASE = process.env.REACT_APP_API_URL;

const tabLabels = {
  create: 'Create',
  profile: 'Profile',
  saved: 'Saved',
  yourRoutes: 'Your Routes',
};

const MAX_PHOTO_BYTES = 200 * 1024; // 200KB max for profile photos

const AuthModal = ({ open, onClose, onAuthenticated, targetTab, externalError }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [climbingLevel, setClimbingLevel] = useState('beginner');
  const [photoData, setPhotoData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setEmail('');
      setPassword('');
      setName('');
      setUsername('');
      setClimbingLevel('beginner');
      setPhotoData(null);
      setMode('login');
    }
  }, [open]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoData(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Profile photo too large (max ~200KB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Enter an email and password.');
      return;
    }

    try {
      if (mode === 'login') {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          return;
        }

        // Get user metadata
        const user = data.user;
        const userData = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          username: user.user_metadata?.username || user.email.split('@')[0],
          climbingLevel: user.user_metadata?.climbingLevel || 'beginner',
          photoData: user.user_metadata?.photoData || user.user_metadata?.avatar_url || null,
        };
        
        // Update profile in database on login (in case metadata changed)
        await syncProfileToDatabase(user.id, userData);
        
        console.log('Login successful, user data:', userData);
        onAuthenticated(userData);
      } else {
        // Sign up with Supabase
        if (!name || !username) {
          setError('Add your name and username.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              username,
              climbingLevel,
              photoData,
            },
          },
        });

        if (error) {
          setError(error.message);
          return;
        }

        // Use the form data directly since we just created this user
        const userData = {
          id: data.user.id,
          email: data.user.email,
          name,
          username,
          climbingLevel,
          photoData,
        };
        
        // Create profile in database
        await syncProfileToDatabase(data.user.id, userData);
        
        console.log('Signup successful, user data:', userData);
        onAuthenticated(userData);
      }
    } catch (err) {
      setError('Authentication error. Please try again.');
      console.error('Auth error:', err);
    }
  };

  // Sync user profile to profiles table via backend API
  const syncProfileToDatabase = async (userId, userData) => {
    try {
      const response = await fetch('${API_BASE}/profiles', {
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

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        setError(error.message);
        console.error('Google sign-in error:', error);
      }
      // The user will be redirected to Google's OAuth page
    } catch (err) {
      setError('Google sign-in error. Please try again.');
      console.error('Google OAuth error:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white border-2 border-gray-900 shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b-2 border-gray-900">
          <div className="flex gap-2 text-sm font-black uppercase tracking-widest">
            <button
              className={`${mode === 'login' ? 'text-blue-600' : 'text-gray-500'}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <span className="text-gray-400">/</span>
            <button
              className={`${mode === 'create' ? 'text-blue-600' : 'text-gray-500'}`}
              onClick={() => setMode('create')}
            >
              Create Account
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 font-black"
          >
            ✕
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <p className="text-xs font-black uppercase tracking-widest text-gray-700">
            Login to access {tabLabels[targetTab] || 'SendStone'}
          </p>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-gray-700">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-900 px-3 py-3 font-bold text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-900 px-3 py-3 font-bold text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {mode === 'create' && (
            <div className="space-y-3 border border-gray-200 p-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-700">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-gray-900 px-3 py-3 font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-700">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border-2 border-gray-900 px-3 py-3 font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. climber123"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-700">
                  Climbing Level
                </label>
                <select
                  value={climbingLevel}
                  onChange={(e) => setClimbingLevel(e.target.value)}
                  className="w-full border-2 border-gray-900 px-3 py-3 font-bold text-gray-900 focus:outline-none focus:border-blue-500 bg-white"
                >
                  {['beginner', 'intermediate', 'expert', 'master'].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-700">
                  Add a Profile Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-gray-700"
                />
                {photoData && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={photoData} alt="Profile preview" className="w-14 h-14 object-cover rounded-full border" />
                    <span className="text-xs text-gray-600 font-semibold">Preview</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(error || externalError) && (
            <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
              {error || externalError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-3 font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            {mode === 'login' ? 'Login' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full border-2 border-gray-300 text-gray-700 py-3 font-black uppercase tracking-widest hover:border-gray-400 flex items-center justify-center gap-2 transition-colors"
          >
            <span className="w-4 h-4 bg-white rounded-full border-2 border-gray-400 inline-flex items-center justify-center text-[10px] leading-none">
              <span className="translate-x-[0.5px]">G</span>
            </span>
            <span>{mode === 'login' ? 'Sign in with Google' : 'Create with Google'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
