# Google OAuth Setup Guide

## Overview
Your SendStone app is now configured to use Google OAuth through Supabase. Follow these steps to complete the setup.

## 1. Configure Google OAuth Provider in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com/project/yvmxxvmzeslhteoohuhv
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list and click to configure it

## 2. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **APIs & Services** > **Credentials**
5. Click **Create Credentials** > **OAuth client ID**
6. Configure the OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **SendStone**
   - User support email: Your email
   - Developer contact: Your email
7. Select **Web application** as the application type
8. Add authorized redirect URIs:
   ```
   https://yvmxxvmzeslhteoohuhv.supabase.co/auth/v1/callback
   ```
9. Click **Create**
10. Copy the **Client ID** and **Client Secret**

## 3. Configure Supabase with Google Credentials

1. Back in Supabase Dashboard > Authentication > Providers > Google
2. Enable the Google provider
3. Paste your **Client ID** from Google Cloud Console
4. Paste your **Client Secret** from Google Cloud Console
5. Click **Save**

## 4. Configure Redirect URLs (Important!)

1. In Supabase Dashboard > Authentication > URL Configuration
2. Add your site URL to the **Redirect URLs** list:
   - For local development: `http://localhost:3000`
   - For production: `https://yourdomain.com`

## 5. Test the Integration

1. Start your React app: `npm start` (from the Frontend directory)
2. Click on a restricted tab (Create, Profile, or Saved)
3. In the auth modal, click **"Sign in with Google"**
4. You should be redirected to Google's login page
5. After signing in with Google, you should be redirected back to your app and automatically logged in

## Troubleshooting

### "Invalid redirect URI" error
- Make sure you added the exact Supabase callback URL to Google Cloud Console
- Check that there are no extra spaces or characters

### User not logging in after Google redirect
- Check browser console for errors
- Verify your Supabase URL and Anon Key are correct in the .env file
- Make sure the redirect URL is configured in Supabase

### "Access blocked" from Google
- Complete the OAuth consent screen configuration
- Add your email as a test user if the app is in testing mode

## What's Been Implemented

✅ Supabase client configured with PKCE flow  
✅ Google OAuth button in the Auth Modal  
✅ OAuth callback handling in the main app  
✅ Email/password authentication with Supabase  
✅ User metadata storage (name, username, climbing level, photo)  
✅ Automatic session persistence  
✅ Sign out functionality  

## Next Steps

After Google OAuth is working, consider:
- Adding more OAuth providers (GitHub, Facebook, etc.)
- Storing user data in Supabase database instead of localStorage
- Implementing password reset functionality
- Adding email verification
