// controllers/cartController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');

/**
 * Get user's cart - Works for both guests and logged-in users
 */
exports.getCart = async (req, res, next) => {
  try {
    // Handle guest user
    if (!req.user) {
      // Initialize guest cart in session if it doesn't exist
      if (!req.session.guestCart) {
        req.session.guestCart = {
          items: [],
          subtotal: 0,
          tax: 0,
          shippingCost: 0,
          total: 0,
          couponCode: null,
          couponDiscount: 0
        };
      }

      const guestCart = req.session.guestCart;
      
      // Populate product details for guest cart items
      if (guestCart.items.length > 0) {
        for (const item of guestCart.items) {
          if (!item.product || !item.product.name) {
            const product = await Product.findById(item.productId)
              .select('name price discountPrice images category stock specifications');
            if (product) {
              item.product = {
                _id: product._id,
                name: product.name,
                price: product.discountPrice || product.price,
                images: product.images,
                category: product.category,
                stock: product.stock,
                specifications: product.specifications
              };
            }
          }
        }
      }

      // Calculate guest cart totals
      await calculateGuestCartTotals(guestCart);
      
      return res.render('cart', {
        title: 'Shopping Cart',
        cart: guestCart,
        user: null,
        isGuest: true
      });
    }

    // Logged-in user - get from database
    let cart = await Cart.findOne({ customer: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice images category stock specifications isActive'
      });

    if (!cart) {
      cart = new Cart({
        customer: req.user._id,
        items: [],
        subtotal: 0,
        tax: 0,
        shippingCost: 0,
        total: 0,
        couponCode: null,
        couponDiscount: 0
      });
      await cart.save();
    }

    // Filter out inactive products or products with zero stock
    const validItems = cart.items.filter(item => 
      item.product && 
      item.product.isActive !== false && 
      item.product.stock > 0
    );

    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      cart.couponCode = null;
      cart.couponDiscount = 0;
    }

    // Calculate fresh totals
    await calculateCartTotals(cart);
    await cart.save();

    res.render('cart', {
      title: 'Shopping Cart',
      cart,
      user: req.user,
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Add item to cart - Works for guests (session) and logged-in users (DB)
 */
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate product
    const product = await Product.findOne({ 
      _id: productId, 
      isActive: true 
    });

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ 
        success: false,
        message: `Only ${product.stock} items available` 
      });
    }

    // Handle guest user
    if (!req.user) {
      // Initialize guest cart in session if it doesn't exist
      if (!req.session.guestCart) {
        req.session.guestCart = {
          items: [],
          subtotal: 0,
          tax: 0,
          shippingCost: 0,
          total: 0,
          couponCode: null,
          couponDiscount: 0
        };
      }

      const guestCart = req.session.guestCart;
      
      // Check if item already in guest cart
      const existingItem = guestCart.items.find(item => item.productId === productId);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          return res.status(400).json({ 
            success: false,
            message: `Cannot add more than ${product.stock} items` 
          });
        }
        existingItem.quantity = newQuantity;
      } else {
        guestCart.items.push({
          productId,
          quantity,
          product: {
            _id: product._id,
            name: product.name,
            price: product.discountPrice || product.price,
            images: product.images,
            category: product.category,
            stock: product.stock,
            specifications: product.specifications
          }
        });
      }

      // Clear coupon when cart changes
      guestCart.couponCode = null;
      guestCart.couponDiscount = 0;

      // Calculate guest cart totals
      await calculateGuestCartTotals(guestCart);
      
      const cartCount = guestCart.items.reduce((sum, item) => sum + item.quantity, 0);

      return res.json({
        success: true,
        message: 'Item added to cart',
        cartItemCount: cartCount,
        isGuest: true
      });
    }

    // Handle logged-in user
    let cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      cart = new Cart({
        customer: req.user._id,
        items: []
      });
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.stock) {
        return res.status(400).json({ 
          success: false,
          message: `Cannot add more than ${product.stock} items` 
        });
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity
      });
    }

    // Clear coupon when cart changes
    cart.couponCode = null;
    cart.couponDiscount = 0;

    await cart.save();
    
    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      message: 'Item added to cart',
      cartItemCount: cartCount,
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be at least 1' 
      });
    }

    // Handle guest user
    if (!req.user) {
      const guestCart = req.session.guestCart;
      
      if (!guestCart) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cart not found' 
        });
      }

      // Find item by index (since guest cart doesn't have MongoDB _id)
      const itemIndex = guestCart.items.findIndex(item => item.productId === itemId);
      
      if (itemIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Item not found in cart' 
        });
      }

      const item = guestCart.items[itemIndex];
      const product = await Product.findById(item.productId);

      if (quantity > product.stock) {
        return res.status(400).json({ 
          success: false,
          message: `Only ${product.stock} items available` 
        });
      }

      item.quantity = quantity;
      
      // Clear coupon when cart changes
      guestCart.couponCode = null;
      guestCart.couponDiscount = 0;
      
      // Recalculate totals
      await calculateGuestCartTotals(guestCart);

      return res.json({
        success: true,
        message: 'Cart updated successfully',
        cart: guestCart,
        isGuest: true
      });
    }

    // Handle logged-in user
    const cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in cart' 
      });
    }

    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ 
        success: false,
        message: `Only ${product.stock} items available` 
      });
    }

    item.quantity = quantity;
    
    // Clear coupon when cart changes
    cart.couponCode = null;
    cart.couponDiscount = 0;
    
    await cart.save();

    // Recalculate totals
    await calculateCartTotals(cart);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price discountPrice images');

    res.json({
      success: true,
      message: 'Cart updated successfully',
      cart: populatedCart,
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Handle guest user
    if (!req.user) {
      const guestCart = req.session.guestCart;
      
      if (!guestCart) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cart not found' 
        });
      }

      guestCart.items = guestCart.items.filter(item => item.productId !== itemId);
      
      // Clear coupon when cart changes
      guestCart.couponCode = null;
      guestCart.couponDiscount = 0;
      
      // Recalculate totals
      await calculateGuestCartTotals(guestCart);
      
      const cartCount = guestCart.items.reduce((sum, item) => sum + item.quantity, 0);

      return res.json({
        success: true,
        message: 'Item removed from cart',
        cartItemCount: cartCount,
        isGuest: true
      });
    }

    // Handle logged-in user
    const cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    cart.items.pull({ _id: itemId });
    
    // Clear coupon when cart changes
    cart.couponCode = null;
    cart.couponDiscount = 0;
    
    await cart.save();
    
    // Recalculate totals
    await calculateCartTotals(cart);
    await cart.save();

    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      message: 'Item removed from cart',
      cartItemCount: cartCount,
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Apply coupon to cart
 */
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a coupon code'
      });
    }

    // Find valid coupon
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    });

    if (!coupon) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired coupon' 
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its maximum usage limit'
      });
    }

    // Handle guest user
    if (!req.user) {
      const guestCart = req.session.guestCart;
      
      if (!guestCart || guestCart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Your cart is empty'
        });
      }

      // Check minimum purchase amount
      if (guestCart.subtotal < coupon.minPurchaseAmount) {
        return res.status(400).json({ 
          success: false,
          message: `Minimum purchase of ₦${coupon.minPurchaseAmount.toLocaleString()} required for this coupon` 
        });
      }

      // Calculate discount
      let discount = 0;
      
      if (coupon.discountType === 'percentage') {
        discount = Math.round((guestCart.subtotal * coupon.discountValue) / 100 * 100) / 100;
      } else {
        discount = coupon.discountValue;
      }

      // Apply max discount limit
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }

      // Apply coupon to cart
      guestCart.couponCode = coupon.code;
      guestCart.couponDiscount = discount;

      // Recalculate totals with discount
      await calculateGuestCartTotals(guestCart);

      return res.json({
        success: true,
        message: 'Coupon applied successfully',
        discount,
        cart: guestCart,
        isGuest: true
      });
    }

    // Handle logged-in user
    const cart = await Cart.findOne({ customer: req.user._id })
      .populate('items.product', 'price discountPrice category');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty'
      });
    }

    // Check minimum purchase amount
    if (cart.subtotal < coupon.minPurchaseAmount) {
      return res.status(400).json({ 
        success: false,
        message: `Minimum purchase of ₦${coupon.minPurchaseAmount.toLocaleString()} required for this coupon` 
      });
    }

    // Check if coupon applies to specific categories or products
    if (coupon.categories.length > 0 || coupon.products.length > 0) {
      const cartProductIds = cart.items.map(item => item.product._id.toString());
      const cartCategories = cart.items.map(item => item.product.category);
      
      const hasValidProduct = coupon.products.some(productId => 
        cartProductIds.includes(productId.toString())
      );
      
      const hasValidCategory = coupon.categories.some(category => 
        cartCategories.includes(category)
      );

      if (!hasValidProduct && !hasValidCategory) {
        return res.status(400).json({
          success: false,
          message: 'This coupon does not apply to items in your cart'
        });
      }
    }

    // Calculate discount
    let discount = 0;
    
    if (coupon.discountType === 'percentage') {
      discount = Math.round((cart.subtotal * coupon.discountValue) / 100 * 100) / 100;
    } else {
      discount = coupon.discountValue;
    }

    // Apply max discount limit
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }

    // Apply coupon to cart
    cart.couponCode = coupon.code;
    cart.couponDiscount = discount;
    await cart.save();

    // Recalculate totals with discount
    await calculateCartTotals(cart);
    await cart.save();

    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price discountPrice images');

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      discount,
      cart: updatedCart,
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Remove coupon from cart
 */
exports.removeCoupon = async (req, res, next) => {
  try {
    // Handle guest user
    if (!req.user) {
      const guestCart = req.session.guestCart;
      
      if (!guestCart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      guestCart.couponCode = null;
      guestCart.couponDiscount = 0;
      
      // Recalculate totals
      await calculateGuestCartTotals(guestCart);

      return res.json({
        success: true,
        message: 'Coupon removed successfully',
        isGuest: true
      });
    }

    // Handle logged-in user
    const cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.couponCode = null;
    cart.couponDiscount = 0;
    await cart.save();

    // Recalculate totals
    await calculateCartTotals(cart);
    await cart.save();

    res.json({
      success: true,
      message: 'Coupon removed successfully',
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Clear entire cart
 */
exports.clearCart = async (req, res, next) => {
  try {
    // Handle guest user
    if (!req.user) {
      if (req.session.guestCart) {
        req.session.guestCart = {
          items: [],
          subtotal: 0,
          tax: 0,
          shippingCost: 0,
          total: 0,
          couponCode: null,
          couponDiscount: 0
        };
      }

      return res.json({
        success: true,
        message: 'Cart cleared successfully',
        isGuest: true
      });
    }

    // Handle logged-in user
    const cart = await Cart.findOne({ customer: req.user._id });

    if (cart) {
      cart.items = [];
      cart.couponCode = null;
      cart.couponDiscount = 0;
      cart.subtotal = 0;
      cart.tax = 0;
      cart.shippingCost = 0;
      cart.total = 0;
      await cart.save();
    }

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get cart count
 */
exports.getCartCount = async (req, res, next) => {
  try {
    // Handle guest user
    if (!req.user) {
      const count = req.session?.guestCart 
        ? req.session.guestCart.items.reduce((sum, item) => sum + item.quantity, 0) 
        : 0;
      
      return res.json({
        success: true,
        count,
        isGuest: true
      });
    }

    // Handle logged-in user
    const cart = await Cart.findOne({ customer: req.user._id });
    const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

    res.json({
      success: true,
      count,
      isGuest: false
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Sync guest cart after login
 */
exports.syncCart = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to sync cart'
      });
    }

    const guestCart = req.session?.guestCart;
    
    if (!guestCart || guestCart.items.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No items to sync' 
      });
    }

    let userCart = await Cart.findOne({ customer: req.user._id });

    if (!userCart) {
      userCart = new Cart({
        customer: req.user._id,
        items: []
      });
    }

    // Merge guest cart with user cart
    for (const guestItem of guestCart.items) {
      const product = await Product.findOne({ 
        _id: guestItem.productId, 
        isActive: true 
      });

      if (!product || product.stock < 1) continue;

      const existingItem = userCart.items.find(
        item => item.product.toString() === guestItem.productId
      );

      if (existingItem) {
        existingItem.quantity = Math.min(
          existingItem.quantity + guestItem.quantity,
          product.stock
        );
      } else {
        userCart.items.push({
          product: guestItem.productId,
          quantity: Math.min(guestItem.quantity, product.stock)
        });
      }
    }

    // Clear coupon after sync
    userCart.couponCode = null;
    userCart.couponDiscount = 0;
    
    await userCart.save();
    await calculateCartTotals(userCart);
    await userCart.save();

    // Clear guest cart after sync
    req.session.guestCart = null;

    res.json({
      success: true,
      message: 'Cart synced successfully',
      cartItemCount: userCart.items.reduce((sum, item) => sum + item.quantity, 0)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all carts (Admin only)
 */
exports.getAllCarts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;
    const total = await Cart.countDocuments();
    
    const carts = await Cart.find()
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name price')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      carts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Render checkout page with cart data - AUTHENTICATED USERS ONLY
 */
exports.getCheckout = async (req, res, next) => {
  try {
    console.log('✅ getCheckout called');
    
    // Check if user is authenticated
    if (!req.user) {
      console.log('❌ Unauthenticated user trying to access checkout');
      return res.redirect('/login?redirect=/cart/checkout');
    }

    // Logged-in user only - get from database
    console.log('Logged-in user checkout flow');
    
    let cart = await Cart.findOne({ customer: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice images category stock specifications isActive'
      });

    if (!cart) {
      cart = {
        items: [],
        subtotal: 0,
        tax: 0,
        shippingCost: 2500,
        total: 0,
        couponCode: null,
        couponDiscount: 0
      };
    }

    // Calculate totals
    if (cart.items && cart.items.length > 0) {
      let subtotal = 0;
      cart.items.forEach(item => {
        const price = item.product?.discountPrice || item.product?.price || 0;
        subtotal += price * (item.quantity || 1);
      });
      cart.subtotal = subtotal;
      cart.tax = Math.round(subtotal * 0.08 * 100) / 100;
      cart.shippingCost = subtotal > 50000 ? 0 : 2500;
      cart.total = subtotal + cart.tax + cart.shippingCost - (cart.couponDiscount || 0);
    }

    res.render('checkout', {
      title: 'Checkout',
      cart: cart,
      user: req.user,
      isGuest: false
    });

  } catch (error) {
    console.error('❌ Error in getCheckout:', error);
    next(error);
  }
};

/**
 * Process checkout and create order - AUTHENTICATED USERS ONLY
 */
exports.processCheckout = async (req, res, next) => {
  try {
    console.log('✅ processCheckout called');
    console.log('Request body:', req.body);
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'You must be logged in to place an order' 
      });
    }
    
    const {
      firstName, lastName, email, phone, address, city, state, zipCode, country,
      shippingMethod, paymentMethod
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !address || !city || !state || !country) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields' 
      });
    }

    // Get cart from database for logged-in user
    const cart = await Cart.findOne({ customer: req.user._id })
      .populate('items.product');
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your cart is empty' 
      });
    }
    
    // Prepare cart items
    const cartItems = cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.discountPrice || item.product.price
    }));
    
    const subtotal = cart.subtotal || 0;
    const discount = cart.couponDiscount || 0;
    const couponCode = cart.couponCode;

    // Calculate shipping cost based on method
    let shippingCost = 0;
    switch(shippingMethod) {
      case 'express':
        shippingCost = 12000;
        break;
      case 'standard':
        shippingCost = 5000;
        break;
      case 'pickup':
        shippingCost = 0;
        break;
      default:
        shippingCost = 5000;
    }

    // Calculate tax (8%)
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    
    // Calculate total
    const total = subtotal + tax + shippingCost - discount;

    // Create shipping address object
    const shippingAddress = {
      firstName,
      lastName,
      email,
      phone,
      street: address, // Note: your model uses 'street' not 'address'
      city,
      state,
      zipCode: zipCode || '',
      country
    };

    // Generate order number
    const timestamp = Date.now();
    const count = await Order.countDocuments();
    const orderNumber = `ORD-${timestamp}-${count + 1}`;
    const reference = `UZY-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;

    // Map payment method to what your model expects
    let paymentMethodEnum;
    switch(paymentMethod) {
      case 'card':
        paymentMethodEnum = 'card'; // Your model expects 'card' as enum value
        break;
      case 'transfer':
        paymentMethodEnum = 'paypal'; // Map to appropriate enum
        break;
      case 'paypal':
        paymentMethodEnum = 'paypal';
        break;
      default:
        paymentMethodEnum = 'card';
    }

    // Create order object
    const orderData = {
      orderNumber: orderNumber,
      customer: req.user._id, // This is now required and we have it
      items: cartItems,
      shippingAddress,
      billingAddress: {
        firstName,
        lastName,
        street: address,
        city,
        state,
        zipCode: zipCode || '',
        country
      },
      subtotal,
      tax,
      shippingCost,
      discount,
      total,
      couponCode: couponCode || undefined,
      paymentMethod: paymentMethodEnum,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      paymentDetails: {
        reference
      }
    };

    console.log('Creating order with data:', orderData);

    // Create order in database
    const order = new Order(orderData);
    await order.save();

    // Update coupon usage if applied
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode },
        { $inc: { usageCount: 1 } }
      );
    }

    // Clear cart
    cart.items = [];
    cart.couponCode = null;
    cart.couponDiscount = 0;
    cart.subtotal = 0;
    cart.tax = 0;
    cart.shippingCost = 0;
    cart.total = 0;
    await cart.save();

    console.log('✅ Order created successfully:', order._id);

    res.json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total
      }
    });

  } catch (error) {
    console.error('❌ Error in processCheckout:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: `Order validation failed: ${messages.join(', ')}` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error processing order' 
    });
  }
};

/**
 * Show order confirmation page
 */
exports.getConfirmation = async (req, res, next) => {
  try {
    res.render('confirmation', {
      title: 'Order Confirmed',
      user: req.user || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to calculate cart totals for logged-in users
 */
async function calculateCartTotals(cart) {
  if (!cart.items.length) {
    cart.subtotal = 0;
    cart.tax = 0;
    cart.shippingCost = 0;
    cart.total = 0;
    return cart;
  }

  let populatedCart;
  if (!cart.items[0].product || typeof cart.items[0].product === 'string') {
    populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'price discountPrice');
  } else {
    populatedCart = cart;
  }

  // Calculate subtotal
  cart.subtotal = populatedCart.items.reduce((sum, item) => {
    const price = item.product.discountPrice || item.product.price;
    return sum + (price * item.quantity);
  }, 0);

  // Calculate tax (8%)
  cart.tax = Math.round(cart.subtotal * 0.08 * 100) / 100;

  // Calculate shipping (Free over ₦50,000)
  cart.shippingCost = cart.subtotal > 50000 ? 0 : 2500;

  // Calculate total with discount
  cart.total = Math.round(
    (cart.subtotal + cart.tax + cart.shippingCost - (cart.couponDiscount || 0)) * 100
  ) / 100;

  // Ensure total is not negative
  if (cart.total < 0) cart.total = 0;

  return cart;
}

/**
 * Helper function to calculate cart totals for guest users
 */
async function calculateGuestCartTotals(cart) {
  if (!cart.items.length) {
    cart.subtotal = 0;
    cart.tax = 0;
    cart.shippingCost = 0;
    cart.total = 0;
    return cart;
  }

  // Calculate subtotal
  cart.subtotal = cart.items.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity);
  }, 0);

  // Calculate tax (8%)
  cart.tax = Math.round(cart.subtotal * 0.08 * 100) / 100;

  // Calculate shipping (Free over ₦50,000)
  cart.shippingCost = cart.subtotal > 50000 ? 0 : 2500;

  // Calculate total with discount
  cart.total = Math.round(
    (cart.subtotal + cart.tax + cart.shippingCost - (cart.couponDiscount || 0)) * 100
  ) / 100;

  // Ensure total is not negative
  if (cart.total < 0) cart.total = 0;

  return cart;
}

module.exports = exports;