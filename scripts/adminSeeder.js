/**
 * Admin Seeder Script
 * Creates initial admin user for the system
 * 
 * Usage: node scripts/adminSeeder.js
 */

const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uzyhomes');

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'mustaeenms@gmail.com' });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('To reset password, use the forgot password feature');
      process.exit(0);
    }

    // Create new admin with correct permissions format (array of strings)
    const admin = new Admin({
      firstName: 'Admin',
      lastName: 'Mustapha',
      email: 'mustaeenms@gmail.com', // Fixed: removed extra .com
      password: 'musamarch', // Change this immediately after first login
      phone: '+2348148484646', // Fixed: removed spaces
      role: 'super_admin',
      permissions: [
        'manage_users',
        'manage_products',
        'manage_orders',
        'manage_coupons',
        'view_analytics',
        'manage_settings'
      ],
      isActive: true
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════════');
    console.log('Email:    mustaeenms@gmail.com');
    console.log('Password: musamarch');
    console.log('Role:     super_admin');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password immediately after first login!');
    console.log('');
    console.log('Access admin panel at: http://localhost:5000/admin/login');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

// Run seeder
seedAdmin();