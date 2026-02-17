# UZYHOMES Admin Panel

Complete admin dashboard for managing the UZYHOMES e-commerce platform.

## 🚀 Features

- **Dashboard**: Real-time statistics, charts, and analytics
- **Products Management**: Full CRUD operations for products
- **Orders Management**: View, update status, track orders
- **Users Management**: Manage customers and their accounts
- **Transactions**: View all payments and revenue
- **Coupons**: Create and manage discount codes
- **Secure Authentication**: Login, logout, password reset
- **Activity Logging**: Track all admin actions
- **Role-based Permissions**: Admin and Super Admin roles

## 📦 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Ensure your `.env` file has:
```env
MONGODB_URI=mongodb://localhost:27017/uzyhomes
JWT_SECRET=your-secret-key
JWT_EXPIRE=1d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRE=7d
SESSION_SECRET=your-session-secret
```

### 3. Create Initial Admin User
```bash
node seeders/adminSeeder.js
```

This will create:
- Email: `admin@uzyhomes.com`
- Password: `Admin@123456`
- Role: `super_admin`

**⚠️ IMPORTANT**: Change the password immediately after first login!

## 🔧 Usage

### 1. Update server.js

Add these routes to your `server.js`:

```javascript
// Admin routes
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');

app.use('/admin/auth', adminAuthRoutes);
app.use('/admin', adminRoutes);
```

### 2. Access Admin Panel

Navigate to:
```
http://localhost:5000/admin/login
```

### 3. Login with Default Credentials

```
Email: admin@uzyhomes.com
Password: Admin@123456
```

## 📁 File Structure

```
/controllers
  ├── adminController.js          # Main admin operations
  └── adminAuthController.js      # Admin authentication

/models
  └── Admin.js                    # Admin user model

/middleware
  └── adminAuth.js                # Admin authentication middleware

/routes
  ├── adminRoutes.js              # Admin panel routes
  └── adminAuthRoutes.js          # Admin auth routes

/views/admin
  ├── login.ejs                   # Login page
  ├── dashboard.ejs               # Main dashboard
  ├── products.ejs                # Products management
  ├── orders.ejs                  # Orders management
  ├── users.ejs                   # Users management
  ├── transactions.ejs            # Transactions view
  ├── coupons.ejs                 # Coupons management
  ├── settings.ejs                # Settings page
  └── partials/
      ├── header.ejs              # Admin header
      └── sidebar.ejs             # Admin sidebar

/public
  ├── css/admin.css               # Admin panel styles
  └── js/admin.js                 # Admin panel scripts

/seeders
  └── adminSeeder.js              # Create initial admin
```

## 🔐 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **Account Locking**: After 5 failed login attempts (2 hours lockout)
- **JWT Authentication**: Secure token-based auth
- **Activity Logging**: All admin actions are logged
- **IP Tracking**: Last login IP is tracked
- **Password Reset**: Secure token-based password reset
- **Role-based Access**: Granular permission system

## 👤 Admin Roles

### Super Admin
- Full access to all features
- Can manage other admins
- Access to system settings

### Admin
- Limited by permission settings
- Cannot access system settings by default
- Permissions include:
  - Manage Products
  - Manage Orders
  - Manage Users
  - Manage Coupons
  - View Transactions

## 📊 Dashboard Features

- **Statistics Cards**: Orders, Revenue, Users, Products
- **Revenue Chart**: Monthly revenue for last 12 months
- **Order Status Distribution**: Pie chart of order statuses
- **Recent Orders**: Latest 10 orders
- **Top Selling Products**: Best performers
- **Low Stock Alerts**: Products with less than 10 units

## 🛠️ API Endpoints

### Authentication
```
GET  /admin/auth/login              - Login page
POST /admin/auth/login              - Login
POST /admin/auth/logout             - Logout
POST /admin/auth/forgot-password    - Request password reset
POST /admin/auth/reset-password     - Reset password
POST /admin/auth/change-password    - Change password
GET  /admin/auth/me                 - Get current admin
```

### Dashboard & Management
```
GET  /admin/dashboard               - Main dashboard
GET  /admin/products                - Products list
POST /admin/products                - Create product
PUT  /admin/products/:id            - Update product
DELETE /admin/products/:id          - Delete product

GET  /admin/orders                  - Orders list
GET  /admin/orders/:id              - Order details
PUT  /admin/orders/:id/status       - Update order status

GET  /admin/users                   - Users list
PUT  /admin/users/:id/status        - Update user status
DELETE /admin/users/:id             - Delete user

GET  /admin/transactions            - Transactions list

GET  /admin/coupons                 - Coupons list
POST /admin/coupons                 - Create coupon
PUT  /admin/coupons/:id             - Update coupon
DELETE /admin/coupons/:id           - Delete coupon
```

## 🔄 Creating Additional Admins

Through the system or directly in MongoDB:

```javascript
const Admin = require('./models/Admin');

const newAdmin = new Admin({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@uzyhomes.com',
  password: 'SecurePassword123',
  role: 'admin',
  permissions: {
    manageProducts: true,
    manageOrders: true,
    manageUsers: false,
    manageCoupons: true,
    viewTransactions: true,
    manageSettings: false
  }
});

await newAdmin.save();
```

## 📝 Activity Log

All admin actions are automatically logged:
- Login/Logout
- Product CRUD operations
- Order status updates
- User management
- Password changes
- Profile updates

Access via:
```
GET /admin/auth/activity
```

## 🎨 Customization

### Styling
Edit `/public/css/admin.css` to customize the admin panel appearance.

### Branding
Update logo and colors in:
- `/views/admin/login.ejs`
- `/views/admin/partials/header.ejs`

### Permissions
Modify permissions in `/models/Admin.js`:
```javascript
permissions: {
  manageProducts: Boolean,
  manageOrders: Boolean,
  manageUsers: Boolean,
  manageCoupons: Boolean,
  viewTransactions: Boolean,
  manageSettings: Boolean,
  // Add custom permissions here
}
```

## 🐛 Troubleshooting

### Cannot login
1. Verify admin exists: `mongo uzyhomes --eval "db.admins.find()"`
2. Check credentials are correct
3. Verify JWT_SECRET is set in .env

### Account locked
Wait 2 hours or manually unlock in MongoDB:
```javascript
db.admins.updateOne(
  { email: 'admin@uzyhomes.com' },
  { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } }
)
```

### Forgot password not working
1. Check email service configuration
2. Verify SMTP settings in .env
3. Check server logs for email errors

## 📮 Support

For issues or questions:
- Email: hello@uzyhomes.com
- Phone: +234 704 751 1911

## 📄 License

Proprietary - UZYHOMES © 2026
