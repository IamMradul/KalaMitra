# Environment Variables Setup

To enable the AI-powered features and Google OAuth for artisans, you need to add the following environment variables to your `.env.local` file:

## Required Environment Variables

### 1. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**How to get the Service Role Key:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to "Settings" > "API"
4. Copy the "service_role" key (NOT the anon key)
5. This key bypasses RLS policies for server-side operations

### 2. Google OAuth Configuration
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret_here
```

**How to get these:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the "Google+ API" or "Google Identity API"
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth 2.0 Client IDs"
6. Choose "Web application"
7. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/google/callback (for development)
   https://your-domain.com/api/auth/google/callback (for production)
   ```
8. Copy the **Client ID** and **Client Secret**

### 3. Google Gemini AI API Key
```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

**How to get this:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Paste it in your `.env.local` file

**Note:** The Gemini 1.5 Flash API has a free tier with generous limits:
- 15 requests per minute
- 1000 requests per day
- Perfect for development and small-scale production

## Complete .env.local Example

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_service_role_key_here

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# Google Gemini AI Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

## Security Notes

- ✅ `NEXT_PUBLIC_` prefix means these variables are exposed to the browser (required for client-side usage)
- ✅ The Google Client ID is safe to expose as it's designed for client-side use
- ❌ The Google Client Secret should NEVER be exposed to the browser (no `NEXT_PUBLIC_` prefix)
- ❌ The Supabase Service Role Key should NEVER be exposed to the browser (no `NEXT_PUBLIC_` prefix)
- ✅ The Gemini API key is safe to expose as it has built-in rate limiting and usage controls
- ✅ Never commit your `.env.local` file to version control
- ✅ The `.env.local` file is already in your `.gitignore`

## Testing the Setup

After adding the environment variables:

1. Restart your development server
2. Go to the Sign In page
3. Click "Sign in with Google" and select your role
4. You should be redirected to Google's OAuth flow
5. After successful authentication, you'll be redirected back to your app

## Troubleshooting

**"Google OAuth not configured" error:**
- Check if your Google Client ID is correct
- Verify the redirect URI is properly configured in Google Cloud Console
- Ensure the Google+ API is enabled

**"Client secret not found" error:**
- Make sure the `GOOGLE_CLIENT_SECRET` is set (without `NEXT_PUBLIC_` prefix)
- Verify the client secret matches your OAuth client ID

**"Service role key not found" error:**
- Make sure the `SUPABASE_SERVICE_ROLE_KEY` is set (without `NEXT_PUBLIC_` prefix)
- Verify you're using the service_role key, not the anon key

**"Failed to analyze image" error:**
- Check if your Gemini API key is correct
- Verify the API key has access to Gemini Pro Vision
- Check your browser console for detailed error messages

**Rate limiting:**
- The free tier allows 15 requests per minute
- If you hit the limit, wait a minute and try again

**Image analysis not working:**
- Ensure the image URL is accessible
- Try uploading a local image instead of a URL
- Check if the image format is supported (JPEG, PNG, etc.)
