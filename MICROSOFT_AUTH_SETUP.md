# Microsoft Authentication Setup Guide

This guide will help you set up Microsoft authentication for KalaMitra.

## Prerequisites

1. A Microsoft Azure account
2. Access to Azure Active Directory (Azure AD) / Microsoft Entra ID

## Step 1: Register Your Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** (or **Microsoft Entra ID**)
3. Click on **App registrations** in the left sidebar
4. Click **New registration**

## Step 2: Configure Application Registration

1. **Name**: Enter a name for your application (e.g., "KalaMitra")
2. **Supported account types**: Choose one of:
   - **Accounts in any organizational directory and personal Microsoft accounts** (Recommended for public apps)
   - **Accounts in any organizational directory** (For organizational apps only)
   - **Personal Microsoft accounts only** (For personal accounts only)
3. **Redirect URI**: 
   - Platform: **Web**
   - URI: `http://localhost:3000/api/auth/microsoft/callback` (for development)
   - For production, add: `https://yourdomain.com/api/auth/microsoft/callback`
4. Click **Register**

## Step 3: Get Your Application Credentials

After registration, you'll be taken to the application overview page:

1. **Application (client) ID**: Copy this value - this is your `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`
2. Go to **Certificates & secrets** in the left sidebar
3. Click **New client secret**
4. Add a description and choose an expiration period
5. Click **Add**
6. **Important**: Copy the secret value immediately (you won't be able to see it again) - this is your `MICROSOFT_CLIENT_SECRET`

## Step 4: Configure API Permissions

1. Go to **API permissions** in the left sidebar
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add the following permissions:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
6. Click **Add permissions**
7. Click **Grant admin consent** (if you have admin rights) to grant permissions for all users

## Step 5: Configure Redirect URIs

1. Go to **Authentication** in the left sidebar
2. Under **Redirect URIs**, add:
   - Development: `http://localhost:3000/api/auth/microsoft/callback`
   - Production: `https://yourdomain.com/api/auth/microsoft/callback`
3. Under **Implicit grant and hybrid flows**, check:
   - ✅ **ID tokens** (used for implicit and hybrid flows)
4. Click **Save**

## Step 6: Add Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Microsoft OAuth Configuration
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

For production, update `NEXT_PUBLIC_MICROSOFT_REDIRECT_URI` to your production URL:
```env
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/auth/microsoft/callback
```

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/auth/signin` or `/auth/signup`
3. Click the **Microsoft** button
4. You should be redirected to Microsoft's login page
5. After successful authentication, you'll be redirected back to your application

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Make sure the redirect URI in your `.env.local` matches exactly with the one configured in Azure Portal
   - Check for trailing slashes and protocol (http vs https)

2. **"AADSTS50011: The reply URL specified in the request does not match"**
   - Verify the redirect URI in Azure Portal matches your environment variable
   - Ensure you're using the correct URL (localhost for dev, production URL for production)

3. **"AADSTS7000215: Invalid client secret"**
   - Check that your `MICROSOFT_CLIENT_SECRET` is correct
   - If the secret expired, create a new one in Azure Portal and update your `.env.local`

4. **"Insufficient permissions"**
   - Make sure you've granted admin consent for the API permissions
   - Verify all required permissions are added: `openid`, `profile`, `email`, `User.Read`

5. **"User photo not loading"**
   - This is normal - Microsoft profile photos are optional and may not always be available
   - The authentication will still work without the photo

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your `MICROSOFT_CLIENT_SECRET` secure and rotate it regularly
- Use different client IDs and secrets for development and production
- Regularly review and audit your Azure AD application permissions

## Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)

