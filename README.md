# KalaMitra: AI Marketplace Assistant for Artisans

🌟 A complete MVP web application that connects artisans with art lovers through a beautiful, culturally-inspired marketplace.

## ✨ Features

### 🔐 Authentication & Role Management
- **Supabase Auth** with email/password
- **Role-based access**: Buyers and Sellers
- **Automatic redirects** based on user role
- **Protected routes** and middleware

### 🎨 Seller Features
- **Virtual Stall Management**: Create and customize your artisan profile
- **Product Management**: Add, edit, and delete products
- **AI Tools Placeholder**: Ready for future AI photo enhancement and story generation
- **Public Stall Pages**: Shareable stall URLs for customers

### 🛍️ Buyer Features
- **Marketplace Browsing**: Discover unique handcrafted items
- **Advanced Search & Filtering**: Find products by category, name, or description
- **Product Details**: Rich product pages with artisan information
- **Shopping Cart**: Add items and manage quantities
- **Artisan Discovery**: Explore individual seller stalls

### 🎭 Cultural Theme & Design
- **Warm Earthy Palette**: Terracotta, saffron, indigo, and beige colors
- **Cultural Patterns**: Mandala-inspired backgrounds and textures
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Smooth Animations**: Framer Motion for delightful user experience

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: TailwindCSS with custom cultural theme
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Ready for Vercel, Netlify, or any Next.js hosting

## 📁 Project Structure

```
kalamitra/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth/              # Authentication pages
│   │   │   ├── signin/        # Sign in page
│   │   │   └── signup/        # Sign up with role selection
│   │   ├── dashboard/         # Role-based dashboard
│   │   │   └── seller/        # Seller dashboard
│   │   ├── marketplace/       # Public marketplace
│   │   ├── product/           # Product detail pages
│   │   ├── stall/             # Public stall pages
│   │   ├── cart/              # Shopping cart
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout with auth provider
│   │   └── page.tsx           # Landing page
│   ├── components/            # Reusable components
│   │   ├── Navbar.tsx         # Navigation with auth state
│   │   └── Footer.tsx         # Cultural-themed footer
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx    # Authentication state management
│   └── lib/                   # Utility libraries
│       └── supabase.ts        # Supabase client & types
├── public/                    # Static assets
├── tailwind.config.js         # Tailwind configuration
├── next.config.ts             # Next.js configuration
└── package.json               # Dependencies
```

## 🗄️ Database Schema

### Tables

1. **profiles**
   - `id` (UUID, PK, references auth.users)
   - `name` (text)
   - `email` (text)
   - `role` (enum: 'buyer' | 'seller')
   - `bio` (text, optional)
   - `profile_image` (text, optional)
   - `created_at` (timestamp)

2. **products**
   - `id` (UUID, PK)
   - `seller_id` (UUID, FK → profiles.id)
   - `title` (text)
   - `category` (text)
   - `description` (text)
   - `price` (numeric)
   - `image_url` (text)
   - `created_at` (timestamp)

3. **cart**
   - `id` (UUID, PK)
   - `buyer_id` (UUID, FK → profiles.id)
   - `product_id` (UUID, FK → products.id)
   - `quantity` (integer)
   - `created_at` (timestamp)

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd kalamitra
npm install
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your credentials
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Database Setup
Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('buyer', 'seller')) NOT NULL,
  bio TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cart table
CREATE TABLE cart (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES profiles(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Sellers can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own products" ON products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own products" ON products FOR DELETE USING (auth.uid() = seller_id);

-- Cart policies
CREATE POLICY "Buyers can view their own cart" ON cart FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers can insert into their own cart" ON cart FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update their own cart" ON cart FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers can delete from their own cart" ON cart FOR DELETE USING (auth.uid() = buyer_id);

-- Create indexes for better performance
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_cart_buyer_id ON cart(buyer_id);
CREATE INDEX idx_cart_product_id ON cart(product_id);
```

### 4. Run the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage

### For Artisans (Sellers)
1. **Sign up** as a Seller
2. **Create your virtual stall** with bio and profile image
3. **Add products** with titles, categories, descriptions, and prices
4. **Manage your inventory** from the seller dashboard
5. **Share your stall** with customers using the public URL

### For Art Lovers (Buyers)
1. **Sign up** as a Buyer
2. **Browse the marketplace** for unique handcrafted items
3. **Search and filter** products by category or keywords
4. **View product details** and artisan information
5. **Add items to cart** and manage your shopping list

## 🔮 Future Features (AI Integration Ready)

The application is designed with AI integration in mind:

- **AI Photo Enhancement**: Placeholder buttons ready for image processing
- **AI Story Generation**: Ready for product storytelling automation
- **Smart Recommendations**: Infrastructure ready for ML-powered suggestions
- **Image Recognition**: Prepared for automatic product categorization

## 🎨 Customization

### Colors & Theme
The cultural theme uses a warm, earthy palette:
- **Primary**: Orange-500 (#f97316)
- **Secondary**: Red-600 (#dc2626)
- **Accent**: Amber-500 (#f59e0b)
- **Background**: Gradient from amber-50 to red-50

### Styling
- Modify `src/app/globals.css` for custom animations
- Update `tailwind.config.js` for theme customization
- Adjust component styles in individual component files

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Other Platforms
- **Netlify**: Compatible with Next.js
- **Railway**: Great for full-stack deployment
- **AWS/GCP**: Use with custom server configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing framework
- **Supabase** for the powerful backend services
- **TailwindCSS** for the utility-first CSS framework
- **Framer Motion** for smooth animations
- **Lucide** for beautiful icons

---

**Preserving Tradition, Empowering Artisans ✨**

Built with ❤️ for the artisan community.
