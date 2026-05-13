# 🐋 Whale Abyss - Full-Stack E-Commerce Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge&logo=postgresql)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-green?style=for-the-badge)
![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)

**A production-grade e-commerce platform for Genshin Impact boosting services**

[Live Demo](https://whaleabyss.ru) • [Features](#-key-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture)

</div>

---

## 📊 Project Stats

- **36,000+** lines of TypeScript/TSX code
- **80+** components and pages
- **30+** API endpoints
- **12** database tables with complex relationships
- **500+** active users capacity
- **100%** type-safe with TypeScript
- **Solo developed** from concept to production

---

## 🎯 Overview

Whale Abyss is a **full-stack e-commerce platform** built from scratch to handle real-world business operations. This isn't a tutorial project—it's a **production application** serving real customers with real payments, featuring a complete admin panel, automated notifications, and a sophisticated order management system.

### What Makes This Project Stand Out

- ✅ **Real Payment Integration** - Freekassa payment gateway with webhook verification
- ✅ **Production Database** - PostgreSQL with Drizzle ORM and complex relations
- ✅ **Admin Dashboard** - Full CRUD operations for services, orders, users, reviews, and events
- ✅ **Telegram Bot Integration** - Real-time order notifications with inline keyboards
- ✅ **Email System** - Automated transactional emails with Nodemailer
- ✅ **Authentication System** - NextAuth.js with OTP verification and password reset
- ✅ **Cloud Storage** - Yandex S3 integration for image uploads
- ✅ **State Management** - Zustand with persistence and DB synchronization
- ✅ **Responsive Design** - Mobile-first approach with Tailwind CSS
- ✅ **Type Safety** - 100% TypeScript with strict mode enabled

---

## 🚀 Key Features

### 🛒 Customer-Facing Features

#### **Service Catalog**
- Dynamic service listings with categories
- Advanced search and filtering
- Service detail pages with rich descriptions
- Real-time pricing and availability
- Image optimization with Next.js Image

#### **Shopping Cart**
- Persistent cart with localStorage and database sync
- Real-time cart updates
- Quantity management
- Promo code validation
- Cart synchronization across devices for authenticated users

#### **Checkout & Payments**
- Secure checkout flow
- Freekassa payment gateway integration
- Multiple payment methods (SBP, cards)
- Order confirmation emails
- Payment status tracking
- Webhook signature verification for security

#### **User Account Management**
- User registration with email OTP verification
- Secure authentication with NextAuth.js
- Password reset flow with token-based verification
- Profile management (avatar upload, game username, Telegram)
- Order history with status tracking
- Active and past orders separation

#### **Reviews System**
- User reviews with 5-star ratings
- Review moderation (pending/approved/rejected)
- Anonymous and authenticated reviews
- Review statistics and analytics

#### **Events & Promotions**
- Time-limited promotional events
- Service-specific discounts
- Event banners with custom backgrounds
- Automatic event activation/deactivation

### 🎛️ Admin Panel Features

#### **Dashboard**
- Real-time statistics overview
- Order management with status updates
- Revenue tracking
- User analytics

#### **Order Management**
- Complete order lifecycle tracking
- Status updates (pending → paid → in_progress → completed)
- Order refunds with Freekassa API
- Search and filter by status, date, user
- Detailed order views with customer information
- Order notes and internal comments

#### **User Management**
- User list with search and filters
- User detail pages with complete profiles
- Order history per user
- Review history per user
- Statistics: total spent, order count, top 3 services
- Role management (user/admin/booster)

#### **Service Management**
- CRUD operations for services
- Category management
- Image upload to Yandex S3
- Price management
- Test service flagging (hidden from public)
- Service activation/deactivation

#### **Promo Code System**
- Create and manage promo codes
- Percentage-based discounts
- Expiration dates
- Usage tracking per user
- One-time use enforcement

#### **Event Management**
- Create promotional events
- Set discount percentages
- Schedule start/end dates
- Upload custom event banners
- Link services to events
- Event activation toggle

#### **Review Moderation**
- Approve/reject reviews
- Review statistics with rating distribution
- Search and filter reviews
- Bulk moderation actions

#### **Testing Tools**
- Create test orders for development
- Test service management
- Payment flow testing

### 🤖 Automation & Integrations

#### **Telegram Bot**
- Real-time order notifications to admin
- Inline keyboard for quick status updates
- Order status changes directly from Telegram
- Follow-up action buttons (complete/cancel)
- Webhook mode for production
- Polling mode for development

#### **Email System**
- Order confirmation emails
- Payment success notifications
- OTP verification emails
- Password reset emails
- Custom email templates
- SMTP integration with Zoho

#### **Payment Webhooks**
- Freekassa webhook integration
- Signature verification for security
- Automatic order status updates
- Payment failure handling
- Success/failure redirect pages

---

## 🏗️ Tech Stack

### **Frontend**
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling
- **Lucide React** - Icon library
- **Next Image** - Optimized image loading

### **Backend**
- **Next.js API Routes** - RESTful API endpoints
- **NextAuth.js** - Authentication system
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Relational database
- **Node.js** - Runtime environment

### **Integrations**
- **Freekassa** - Payment gateway
- **Telegraf** - Telegram bot framework
- **Nodemailer** - Email sending
- **AWS SDK** - Yandex S3 storage
- **bcrypt** - Password hashing

### **DevOps & Tools**
- **Git** - Version control
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking
- **Turbopack** - Fast bundler

---

## 📐 Architecture

### **Database Schema**

```
users (authentication, profiles, roles)
  ├── orders (order management)
  │   └── order_items (line items with services)
  ├── reviews (user feedback)
  ├── cart_items (persistent shopping cart)
  └── promocode_usage (promo tracking)

services (product catalog)
  ├── categories (service grouping)
  └── event_services (promotional links)

events (time-limited promotions)
promocodes (discount codes)
otps (email verification)
password_reset_tokens (password recovery)
```

**12 tables** with foreign key relationships, cascading deletes, and proper indexing.

### **API Architecture**

**30+ RESTful endpoints** organized by domain:

```
/api
├── auth/
│   ├── register (POST)
│   ├── send-otp (POST)
│   ├── forgot-password (POST)
│   ├── reset-password (POST)
│   └── [...nextauth] (NextAuth handlers)
├── user/
│   ├── profile (GET, PATCH)
│   ├── avatar (POST)
│   ├── orders (GET)
│   └── delete (DELETE)
├── cart/
│   ├── sync (POST)
│   ├── load (GET)
│   └── clear (DELETE)
├── checkout (POST)
├── payment/
│   └── freekassa/
│       ├── notify (POST - webhook)
│       ├── success (GET)
│       └── fail (GET)
├── reviews (GET, POST)
├── events (GET)
├── promocode/validate (POST)
├── telegram/webhook (POST)
└── admin/
    ├── orders/ (CRUD + refund)
    ├── users/ (Read + detail)
    ├── services/ (CRUD + upload)
    ├── promocodes/ (CRUD)
    ├── events/ (CRUD)
    └── reviews/ (Read + moderate)
```

### **Security Features**

- **Authentication**: Session-based with NextAuth.js
- **Authorization**: Role-based access control (RBAC)
- **Middleware**: Edge middleware for admin route protection
- **Password Security**: bcrypt hashing with salt
- **OTP Verification**: Time-limited email codes
- **Payment Security**: Webhook signature verification
- **SQL Injection Prevention**: Parameterized queries with Drizzle
- **XSS Protection**: React's built-in escaping
- **CSRF Protection**: NextAuth.js CSRF tokens

### **State Management Strategy**

- **Server State**: React Server Components (default)
- **Client State**: Zustand for cart and UI state
- **Form State**: React Hook Form with validation
- **Cache Strategy**: React cache() for expensive queries
- **Persistence**: localStorage + database sync for cart

---

## 🎨 UI/UX Highlights

- **Custom Design System** - Consistent spacing, colors, and typography
- **Onest Font Family** - Modern, clean typography
- **Responsive Layout** - Mobile-first approach
- **Loading States** - Skeleton screens and spinners
- **Error Handling** - User-friendly error messages
- **Toast Notifications** - Real-time feedback
- **Modal Dialogs** - Confirmation prompts
- **Pagination** - Efficient data loading
- **Search & Filters** - Advanced filtering capabilities
- **Breadcrumbs** - Clear navigation hierarchy

---

## 📊 Database Design Highlights

### **Complex Relationships**
- One-to-Many: Users → Orders, Orders → OrderItems
- Many-to-Many: Events ↔ Services (through event_services)
- Self-referential: Promocode usage tracking

### **Data Integrity**
- Foreign key constraints with cascading deletes
- Unique constraints on emails, usernames, slugs
- Default values and timestamps
- Enum types for status fields

### **Performance Optimizations**
- Indexed columns for fast lookups
- Efficient join queries
- Pagination for large datasets
- Connection pooling with node-postgres

---

## 🔧 Development Practices

### **Code Quality**
- **TypeScript Strict Mode** - Maximum type safety
- **ESLint Configuration** - Code style enforcement
- **Component Organization** - Logical file structure
- **Naming Conventions** - Consistent and descriptive
- **Code Reusability** - DRY principles

### **Database Management**
- **Migration Scripts** - Version-controlled schema changes
- **Idempotent Migrations** - Safe to run multiple times
- **Seed Scripts** - Test data generation
- **Backup Strategy** - Regular database backups

### **Git Workflow**
- **Meaningful Commits** - Clear commit messages
- **Feature Branches** - Isolated development
- **Version Control** - Complete project history

---

## 🚀 Deployment & Production

### **Environment Configuration**
- Environment variables for secrets
- Separate dev/prod configurations
- Database connection pooling
- Error logging and monitoring

### **Performance**
- Next.js Image optimization
- Static page generation where possible
- API route optimization
- Database query optimization

### **Scalability**
- Designed for 500+ concurrent users
- Efficient database queries
- Stateless API design
- Horizontal scaling ready

---

## 📈 Business Logic Implementation

### **Order Lifecycle**
```
pending → paid → in_progress → completed
                ↓
            cancelled / refunded
```

### **Payment Flow**
1. User creates order (status: pending)
2. Redirect to Freekassa payment page
3. User completes payment
4. Freekassa sends webhook to /api/payment/freekassa/notify
5. Verify signature and update order status to 'paid'
6. Send Telegram notification to admin
7. Send confirmation email to user
8. Admin processes order (in_progress → completed)

### **Cart Synchronization**
- Guest users: localStorage only
- Authenticated users: localStorage + database
- On login: merge localStorage cart with database cart
- Real-time sync on cart changes

### **Promo Code Logic**
- Validate code exists and not expired
- Check if user already used this code
- Apply discount percentage to cart total
- Track usage in promocode_usage table

---

## 🎓 What I Learned

Building this project solo taught me:

- **Full-stack development** - From database design to UI/UX
- **Payment integration** - Real-world payment gateway implementation
- **Authentication & security** - Proper user authentication and authorization
- **Database design** - Complex relationships and data integrity
- **API design** - RESTful principles and best practices
- **State management** - Client and server state synchronization
- **Real-time features** - Webhooks and bot integrations
- **Production deployment** - Environment management and scaling
- **Problem solving** - Debugging complex issues independently
- **Project management** - Planning and executing a large project

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/genshin_abyss.git
cd genshin_abyss

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
node run_migrations.mjs

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=your-email
EMAIL_SERVER_PASSWORD=your-password
FREEKASSA_SHOP_ID=your-shop-id
FREEKASSA_SECRET_1=your-secret-1
FREEKASSA_SECRET_2=your-secret-2
FREEKASSA_API_KEY=your-api-key
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-chat-id
YANDEX_KEY_ID=your-key-id
YANDEX_SECRET_KEY=your-secret-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

---

## 📝 Project Structure

```
genshin_abyss/
├── app/                      # Next.js App Router
│   ├── (pages)/             # Public pages
│   ├── admin/               # Admin panel
│   │   ├── orders/          # Order management
│   │   ├── users/           # User management
│   │   ├── services/        # Service management
│   │   ├── promocodes/      # Promo code management
│   │   ├── events/          # Event management
│   │   ├── reviews/         # Review moderation
│   │   └── testing/         # Testing tools
│   └── api/                 # API routes
│       ├── auth/            # Authentication
│       ├── user/            # User operations
│       ├── cart/            # Cart operations
│       ├── payment/         # Payment webhooks
│       ├── admin/           # Admin API
│       └── telegram/        # Telegram webhook
├── components/              # Reusable components
├── lib/                     # Utilities and core logic
│   ├── schema.ts           # Database schema
│   ├── db.ts               # Database connection
│   ├── auth/               # Auth configuration
│   ├── freekassa.ts        # Payment integration
│   ├── telegramClient.ts   # Telegram bot
│   └── email.ts            # Email service
├── store/                   # Zustand stores
├── types/                   # TypeScript types
├── public/                  # Static assets
└── scripts/                 # Utility scripts
```

---

## 🎯 Future Enhancements

- [ ] Real-time order tracking with WebSockets
- [ ] Advanced analytics dashboard
- [ ] Multi-language support (i18n)
- [ ] Mobile app with React Native
- [ ] AI-powered service recommendations
- [ ] Loyalty points system
- [ ] Referral program
- [ ] Live chat support
- [ ] Advanced reporting and exports
- [ ] API rate limiting

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 👨‍💻 About the Developer

This entire project was **designed, developed, and deployed by a single developer** as a demonstration of full-stack development capabilities. From database architecture to UI/UX design, from payment integration to bot automation—every line of code, every design decision, and every feature was implemented solo.

**Skills Demonstrated:**
- Full-stack TypeScript development
- Database design and optimization
- RESTful API architecture
- Payment gateway integration
- Real-time notifications
- Authentication & authorization
- Cloud storage integration
- Email automation
- Bot development
- Production deployment
- UI/UX design
- Project management

---

<div align="center">

**Built with ❤️ and lots of ☕**

[⬆ Back to Top](#-whale-abyss---full-stack-e-commerce-platform)

</div>
