import { NextRequest, NextResponse } from 'next/server'
import { completeGoogleAuth } from '@/lib/google-oauth'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role key for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key to bypass RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(new URL('/auth/signin?error=oauth_failed', request.url))
    }

    // Check if we have an authorization code
    if (!code) {
      return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url))
    }

    // Parse state parameter to get role
    let role = 'buyer' // default role
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state))
        role = stateData.role || 'buyer'
      } catch (e) {
        console.warn('Failed to parse state parameter:', e)
      }
    }

    // Complete Google OAuth flow
    const googleUser = await completeGoogleAuth(code)
    console.log('Google user info:', googleUser)

    // Check if user already exists in our database
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', googleUser.email)
      .single()

    if (existingProfile) {
      console.log('User already exists:', existingProfile)
      // Only update the profile image if it is not already set
      if (!existingProfile.profile_image) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            profile_image: googleUser.picture // Update with Google profile picture
          })
          .eq('id', existingProfile.id)
        if (updateError) {
          console.warn('Failed to update profile with Google info:', updateError)
        }
      }
      // User exists, redirect to appropriate dashboard with session data
      const redirectUrl = existingProfile.role === 'seller' ? '/dashboard' : '/marketplace'
      const sessionData = encodeURIComponent(JSON.stringify({
        ...googleUser,
        // Use the existing profile ID (which is the Supabase Auth user ID)
        id: existingProfile.id
      }))
      return NextResponse.redirect(new URL(`${redirectUrl}?google_session=${sessionData}`, request.url))
    }

    // Check if user exists in Supabase Auth
    const { data: existingAuthUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    let authUserId = null
    if (existingAuthUsers?.users) {
      const existingAuthUser = existingAuthUsers.users.find(user => user.email === googleUser.email)
      if (existingAuthUser) {
        authUserId = existingAuthUser.id
        console.log('Found existing Auth user:', authUserId)
      }
    }

    // If no existing Auth user, create one
    if (!authUserId) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: googleUser.email,
        password: `google_${googleUser.id}_${Date.now()}`, // Generate a unique password
        email_confirm: true, // Auto-confirm email for Google users
        user_metadata: {
          name: googleUser.name,
          role: role,
          google_id: googleUser.id,
          picture: googleUser.picture
        }
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', request.url))
      }

      authUserId = authData.user?.id
      console.log('Created new Auth user:', authUserId)
    }

    // Create profile in our database using the Supabase Auth user ID
    if (authUserId) {
      const { error: profileCreateError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: authUserId, // Use the Supabase Auth user ID
          name: googleUser.name,
          email: googleUser.email,
          role: role,
          profile_image: googleUser.picture,
          bio: null,
          store_description: null,
          created_at: new Date().toISOString()
        }])

      if (profileCreateError) {
        console.error('Profile creation error:', profileCreateError)
        return NextResponse.redirect(new URL('/auth/signin?error=profile_failed', request.url))
      }

      console.log('Profile created successfully for Google user:', authUserId)

      // Redirect to appropriate dashboard based on role with session data
      const redirectUrl = role === 'seller' ? '/dashboard' : '/marketplace'
      const sessionData = encodeURIComponent(JSON.stringify({
        ...googleUser,
        id: authUserId // Use the Supabase Auth user ID
      }))
      return NextResponse.redirect(new URL(`${redirectUrl}?google_session=${sessionData}`, request.url))
    }

    // If we get here, something went wrong
    return NextResponse.redirect(new URL('/auth/signin?error=unknown_error', request.url))

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url))
  }
}
