// controllers/addressController.js
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Get user's address
 */
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('address firstName lastName phone');
    
    res.json({
      success: true,
      addresses: user.address ? [{
        _id: 'default',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        ...user.address,
        isDefault: true
      }] : []
    });
  } catch (error) {
    logger.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load addresses'
    });
  }
};

/**
 * Update user's address
 */
exports.updateAddress = async (req, res, next) => {
  try {
    const {
      street, city, state, zipCode, country,
      firstName, lastName, phone
    } = req.body;

    // Update user with new address and contact info
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        phone: phone || req.user.phone,
        address: {
          street,
          city,
          state,
          zipCode,
          country: country || 'Nigeria'
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Address updated successfully',
      address: {
        _id: 'default',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        ...user.address,
        isDefault: true
      }
    });
  } catch (error) {
    logger.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update address'
    });
  }
};

/**
 * Delete address (set to null)
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { address: 1 } }
    );

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    logger.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address'
    });
  }
};