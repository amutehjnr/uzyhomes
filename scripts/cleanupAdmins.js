// scripts/cleanupAdmins.js
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const cleanupAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete the admin with incorrect email (mustaeenms@gmail.com.com)
    const deleted = await Admin.deleteOne({ email: 'mustaeenms@gmail.com.com' });
    console.log(`✅ Deleted admin with incorrect email: ${deleted.deletedCount} record(s)`);

    // Check remaining admin
    const remainingAdmin = await Admin.findOne({ email: 'mustaeenms@gmail.com' });
    
    if (remainingAdmin) {
      console.log('\n✅ Correct admin found:');
      console.log('ID:', remainingAdmin._id);
      console.log('Email:', remainingAdmin.email);
      console.log('Name:', remainingAdmin.firstName, remainingAdmin.lastName);
      console.log('Role:', remainingAdmin.role);
      
      // Update the admin to ensure it has all required fields
      remainingAdmin.firstName = remainingAdmin.firstName || 'Admin';
      remainingAdmin.lastName = remainingAdmin.lastName || 'User';
      remainingAdmin.phone = remainingAdmin.phone || '+2348148484646';
      remainingAdmin.permissions = remainingAdmin.permissions || [
        'manage_users',
        'manage_products',
        'manage_orders',
        'manage_coupons',
        'view_analytics',
        'manage_settings'
      ];
      
      await remainingAdmin.save();
      console.log('✅ Admin record updated');
    } else {
      console.log('❌ No admin found with correct email');
    }

    console.log('\n═══════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

cleanupAdmins();