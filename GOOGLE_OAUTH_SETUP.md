# Google OAuth Setup Guide (Without Firebase)

This guide will help you set up pure Google OAuth for your KalaMitra application without using Firebase.

## 🚀 Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Sign in with your Google account

2. **Create a New Project**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "KalaMitra OAuth")
   - Click "Create"

3. **Select Your Project**
   - Make sure your new project is selected in the dropdown

## 🔧 Step 2: Enable Required APIs

1. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click on it and click "Enable"

2. **Enable Google Identity API** (if available)
   - Search for "Google Identity API"
   - Click on it and click "Enable"

## 🔐 Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Click "Create"

2. **Fill in App Information**
   - **App name**: `KalaMitra`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
   - **App logo**: Optional (you can add your logo later)

3. **Add Scopes**
   - Click "Add or remove scopes"
   - Add these scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Click "Update"

4. **Add Test Users** (for development)
   - Click "Add users"
   - Add your email address and any other test users
   - Click "Add"

5. **Save and Continue**
   - Click "Save and Continue" through all sections

## 🔑 Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"

2. **Configure OAuth Client**
   - **Application type**: Web application
   - **Name**: `KalaMitra Web Client`

3. **Add Authorized Redirect URIs**
   ```
   http://localhost:3000/api/auth/google/callback
   https://your-domain.com/api/auth/google/callback (for production)
   ```

4. **Create the Client**
   - Click "Create"
   - **Copy the Client ID and Client Secret** (you'll need these for your environment variables)

## 🔧 Step 5: Update Your Environment Variables

1. **Create/Update `.env.local`**
   Add these variables to your `.env.local` file:
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

   # Google OAuth Configuration
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

   # Google Gemini AI Configuration
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```

2. **Restart Your Development Server**
   ```bash
   npm run dev
   ```

## 🧪 Step 6: Test the Setup

1. **Test Google Sign-in**
   - Go to your sign-in page
   - Click "Sign in with Google"
   - Select a role (Buyer or Artisan)
   - Complete the Google OAuth flow
   - You should be redirected back to your app

2. **Check User Creation**
   - After successful sign-in, check your Supabase database
   - A new profile should be created in the `profiles` table
   - The user should have the selected role

## 🔒 Step 7: Security Considerations

1. **Domain Restrictions** (Optional)
   - In Google Cloud Console, go to "APIs & Services" > "Credentials"
   - Edit your OAuth 2.0 Client ID
   - Add your production domain to "Authorized JavaScript origins"
   - Add your production callback URL to "Authorized redirect URIs"

2. **Client Secret Security**
   - The `GOOGLE_CLIENT_SECRET` should NEVER be exposed to the browser
   - It's only used in server-side API routes
   - Make sure it doesn't have the `NEXT_PUBLIC_` prefix

## 🚨 Troubleshooting

### Common Issues

**"Invalid redirect URI" error:**
- Make sure `http://localhost:3000/api/auth/google/callback` is in your authorized redirect URIs
- For production, add your domain too

**"OAuth consent screen not configured" error:**
- Complete the OAuth consent screen setup in Google Cloud Console
- Add your email as a test user if needed

**"Client ID not found" error:**
- Make sure the `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
- Verify the Client ID matches your OAuth credentials

**"Client secret not found" error:**
- Make sure the `GOOGLE_CLIENT_SECRET` is set (without `NEXT_PUBLIC_` prefix)
- Verify the client secret matches your OAuth client ID

### Getting Help

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for error messages in the Console tab

2. **Check Network Tab**
   - Look for failed requests
   - Check if OAuth redirects are working

3. **Verify Configuration**
   - Double-check all environment variables
   - Ensure OAuth credentials are properly configured

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com)
- [Google OAuth Playground](https://developers.google.com/oauthplayground/)

## 🔄 OAuth Flow Overview

1. **User clicks "Sign in with Google"**
2. **App redirects to Google OAuth** with role information in state parameter
3. **User authenticates with Google**
4. **Google redirects back** to `/api/auth/google/callback` with authorization code
5. **Server exchanges code** for access token
6. **Server gets user info** from Google
7. **Server creates/updates user** in Supabase database
8. **User is redirected** to appropriate dashboard

---

**🎉 Congratulations!** Your KalaMitra application now has pure Google OAuth integrated without Firebase. Users can sign in with their Google accounts and automatically get profiles created with their selected roles.
