// models/Admin.js - Make sure this is your complete model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      'manage_users', 
      'manage_products', 
      'manage_orders', 
      'manage_coupons', 
      'view_analytics', 
      'manage_settings',
      'manage_reports',
      'manage_reviews',
      'manage_vendors',
      'view_transactions'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  lastLoginIp: String,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  activityLog: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    details: String
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    console.log('🔐 Hashing password for admin:', this.email);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000;
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('🔐 Comparing password for admin:', this.email);
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
adminSchema.methods.updateLastLogin = async function(ipAddress) {
  this.lastLogin = new Date();
  this.lastLoginIp = ipAddress;
  await this.save();
};

// Log activity
adminSchema.methods.logActivity = async function(action, ipAddress, details) {
  this.activityLog.push({
    action,
    ipAddress,
    details,
    timestamp: new Date()
  });
  
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  await this.save();
};

// Check if password was changed after JWT was issued
adminSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Find admin by credentials
adminSchema.statics.findByCredentials = async function(email, password) {
  console.log('🔍 Finding admin by credentials:', email);
  
  const admin = await this.findOne({ email }).select('+password');
  
  if (!admin) {
    console.log('❌ Admin not found with email:', email);
    throw new Error('Invalid email or password');
  }
  
  console.log('✅ Admin found:', admin.email);
  
  const isMatch = await admin.comparePassword(password);
  
  if (!isMatch) {
    console.log('❌ Password mismatch for admin:', admin.email);
    throw new Error('Invalid email or password');
  }
  
  if (!admin.isActive) {
    console.log('❌ Admin account is inactive:', admin.email);
    throw new Error('Account is deactivated. Please contact support.');
  }
  
  console.log('✅ Admin credentials verified:', admin.email);
  return admin;
};

// To JSON method
adminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  delete admin.passwordResetToken;
  delete admin.passwordResetExpires;
  delete admin.twoFactorSecret;
  delete admin.__v;
  return admin;
};

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;