// Microsoft OAuth Configuration
const MICROSOFT_CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!

// Microsoft OAuth endpoints
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const MICROSOFT_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me'

// OAuth scopes
const SCOPES = [
  'openid',
  'profile',
  'email',
  'User.Read'
].join(' ')

// Redirect URI (must match what's configured in Azure AD)
const REDIRECT_URI = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI!

export interface MicrosoftUser {
  id: string
  email: string
  name: string
  picture?: string
  verified_email?: boolean
}

export interface MicrosoftAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  id_token?: string
}

// Generate Microsoft OAuth URL
export function generateMicrosoftAuthURL(state?: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    response_mode: 'query',
  })

  if (state) {
    params.append('state', state)
  }

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<MicrosoftAuthResponse> {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  return response.json()
}

// Get user info from Microsoft Graph API
export async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUser> {
  // Get basic profile info
  const profileResponse = await fetch(MICROSOFT_USERINFO_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!profileResponse.ok) {
    throw new Error('Failed to get user info from Microsoft')
  }

  const profileData = await profileResponse.json()

  // Get user photo if available
  let picture: string | undefined
  try {
    const photoResponse = await fetch(`${MICROSOFT_USERINFO_URL}/photo/$value`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    if (photoResponse.ok) {
      const photoBlob = await photoResponse.blob()
      picture = URL.createObjectURL(photoBlob)
    }
  } catch (error) {
    console.warn('Could not fetch Microsoft profile photo:', error)
  }

  return {
    id: profileData.id,
    email: profileData.mail || profileData.userPrincipalName,
    name: profileData.displayName || profileData.givenName + ' ' + profileData.surname,
    picture: picture,
    verified_email: true, // Microsoft accounts are verified
  }
}

// Complete OAuth flow
export async function completeMicrosoftAuth(code: string): Promise<MicrosoftUser> {
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)
    
    // Get user info
    const userInfo = await getMicrosoftUserInfo(tokens.access_token)
    
    return userInfo
  } catch (error) {
    console.error('Microsoft OAuth error:', error)
    throw new Error('Microsoft authentication failed')
  }
}

