# Supabase Storage Setup for Image Uploads

To enable image uploads for the AI product features, you need to configure Supabase storage.

## 🗂️ **Step 1: Create Storage Bucket**

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Sign in and select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click "Create a new bucket"

3. **Configure the Bucket**
   - **Name**: `images` ✅ **Already exists**
   - **Public bucket**: ✅ **Enable this** (so images can be accessed publicly)
   - **File size limit**: 5MB (or your preferred limit)
   - **Allowed MIME types**: `image/*`

4. **Click "Create bucket"**

## 🔐 **Step 2: Configure Storage Policies**

After creating the bucket, you need to set up Row Level Security (RLS) policies.

### **Policy 1: Allow Authenticated Users to Upload**

1. Go to the `images` bucket
2. Click on "Policies" tab
3. Click "New Policy"
4. Choose "Create a policy from scratch"
5. Configure:
   - **Policy name**: `Allow authenticated uploads`
   - **Target roles**: `authenticated`
   - **Policy definition**:
   ```sql
   (bucket_id = 'images'::text)
   ```
   - **Using expression**:
   ```sql
   (bucket_id = 'images'::text)
   ```
   - **With check expression**:
   ```sql
   (bucket_id = 'images'::text)
   ```

### **Policy 2: Allow Public Read Access**

1. Click "New Policy" again
2. Choose "Create a policy from scratch"
3. Configure:
   - **Policy name**: `Allow public read access`
   - **Target roles**: `public`
   - **Policy definition**:
   ```sql
   (bucket_id = 'images'::text)
   ```

## 📁 **Step 3: Folder Structure**

The system will automatically create this folder structure:
```
images/
└── product-images/
    ├── abc123.jpg
    ├── def456.png
    └── ...
```

## 🔧 **Step 4: Test the Setup**

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Test image upload**
   - Go to Seller Dashboard
   - Click "AI Product Creator"
   - Upload an image
   - The image should upload to Supabase storage

## 🚨 **Troubleshooting**

### **"Failed to upload image" Error**

**Possible causes:**
- Storage bucket doesn't exist
- RLS policies not configured
- User not authenticated
- File too large

**Solutions:**
1. Check if the `images` bucket exists
2. Verify RLS policies are set up correctly
3. Ensure user is logged in
4. Check file size limits

### **Images Not Displaying**

**Possible causes:**
- Bucket not set to public
- Incorrect public URL generation
- CORS issues

**Solutions:**
1. Make sure bucket is public
2. Check if public URLs are generated correctly
3. Verify CORS settings in Supabase

### **Permission Denied**

**Possible causes:**
- RLS policies too restrictive
- User role not matching policy

**Solutions:**
1. Review RLS policies
2. Check user authentication status
3. Ensure policies allow the required operations

## 📊 **Storage Usage**

### **File Naming Convention**
- Files are automatically named with random strings
- Format: `{random_string}.{extension}`
- Example: `a1b2c3d4.jpg`

### **File Organization**
- All product images go in `product-images/` folder
- This keeps storage organized and scalable

### **Cost Considerations**
- Supabase provides 1GB free storage
- Additional storage costs apply beyond free tier
- Monitor usage in Supabase dashboard

## 🔒 **Security Best Practices**

1. **File Type Validation**
   - Only allow image files (`image/*`)
   - Reject executable files

2. **File Size Limits**
   - Set reasonable limits (5MB recommended)
   - Prevents abuse and saves storage

3. **Public Access**
   - Only product images need public access
   - Keep other buckets private

4. **Regular Cleanup**
   - Remove unused images periodically
   - Monitor storage usage

## 🎯 **Next Steps**

After setting up storage:

1. **Test the complete flow:**
   - Upload image → AI analysis → Save product
   - Verify image displays in product listings

2. **Monitor performance:**
   - Check upload speeds
   - Monitor storage usage

3. **Optimize if needed:**
   - Implement image compression
   - Add image resizing
   - Set up CDN if required

---

**Your image upload system is now ready! 🚀**

Artisans can upload images that will be stored securely in Supabase and used for AI analysis and product listings.
