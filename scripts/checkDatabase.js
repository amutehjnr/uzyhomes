// scripts/checkDatabase.js
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const checkDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check all admins
    const admins = await Admin.find({}).select('+password');
    console.log('\n📊 Admins in database:');
    console.log('═══════════════════════════════════════════');
    
    if (admins.length === 0) {
      console.log('❌ No admins found in database');
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n👤 Admin ${index + 1}:`);
        console.log(`ID: ${admin._id}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Name: ${admin.firstName} ${admin.lastName}`);
        console.log(`Role: ${admin.role}`);
        console.log(`Active: ${admin.isActive}`);
        console.log(`Password exists: ${admin.password ? '✅' : '❌'}`);
      });
    }

    console.log('\n═══════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDatabase();