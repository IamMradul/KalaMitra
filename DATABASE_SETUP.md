# Database Setup Guide

## Supabase Database Configuration

### 1. Enable Row Level Security (RLS)

Enable RLS on the `profiles` table in your Supabase dashboard.

### 2. Create RLS Policies

Create the following policies in your Supabase dashboard:

#### Policy 1: Public can view profiles
- **Name**: `Public can view profiles`
- **Command**: `SELECT`
- **Applied to**: `anon, authenticated`
- **Definition**: `true`

#### Policy 2: Users can insert their own profile
- **Name**: `Users can insert their own profile`
- **Command**: `INSERT`
- **Applied to**: `authenticated`
- **Definition**: `auth.uid() = id`

#### Policy 3: Users can update their own profile
- **Name**: `Users can update their own profile`
- **Command**: `UPDATE`
- **Applied to**: `authenticated`
- **Definition**: `auth.uid() = id`

#### Policy 4: Users can view their own profile
- **Name**: `Users can view their own profile`
- **Command**: `SELECT`
- **Applied to**: `authenticated`
- **Definition**: `auth.uid() = id`

#### Policy 5: Service role bypass (IMPORTANT for Google OAuth)
- **Name**: `Service role bypass`
- **Command**: `ALL`
- **Applied to**: `service_role`
- **Definition**: `true`

### 3. Alternative: Disable RLS for Development

If you're having issues with RLS and Google OAuth, you can temporarily disable RLS on the `profiles` table:

1. Go to your Supabase dashboard
2. Navigate to Authentication > Policies
3. Find the `profiles` table
4. Click "Disable RLS" button

**Note**: This is only recommended for development. For production, use the proper RLS policies above.

### 4. Verify Service Role Key

Make sure your `SUPABASE_SERVICE_ROLE_KEY` environment variable is set correctly:

```bash
# In your .env.local file
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find your service role key in:
- Supabase Dashboard > Settings > API
- Look for "service_role" key (not the anon key)

### 5. Test Google OAuth

After setting up the policies:

1. Try signing in with Google
2. Check the browser console for any errors
3. Visit `/debug` page to see authentication state
4. Check Supabase logs for any RLS violations

### 6. Troubleshooting RLS Issues

If you're still getting RLS errors:

1. **Check Service Role Key**: Ensure you're using the correct service role key
2. **Verify Policy**: Make sure the "Service role bypass" policy is created
3. **Check Table Permissions**: Ensure the service role has proper permissions
4. **Temporary Disable**: Disable RLS temporarily to test if that's the issue

### 7. Production Considerations

For production:

1. **Enable RLS**: Always enable RLS for security
2. **Use Proper Policies**: Implement the policies listed above
3. **Service Role Security**: Keep your service role key secure and server-side only
4. **Monitor Logs**: Check Supabase logs for any security issues
