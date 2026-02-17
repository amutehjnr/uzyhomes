const Contact = require('../models/Contact');
const Subscriber = require('../models/Subscriber');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

/**
 * Submit contact form
 */
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, service, message, subscribeToNewsletter } = req.body;

    // Validate required fields
    if (!name || !email || !service || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Get IP and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create contact record
    const contact = new Contact({
      name,
      email,
      phone,
      service,
      message,
      subscribeToNewsletter: subscribeToNewsletter || false,
      ipAddress,
      userAgent,
      status: 'new'
    });

    await contact.save();
    logger.info(`New contact form submission from ${email}`);

    // Handle newsletter subscription if checked
    if (subscribeToNewsletter) {
      try {
        let subscriber = await Subscriber.findOne({ email });
        
        if (!subscriber) {
          subscriber = new Subscriber({
            email,
            name,
            source: 'contact_form',
            ipAddress,
            userAgent
          });
          await subscriber.save();
          logger.info(`New subscriber from contact form: ${email}`);
          
          // Send welcome email using existing email service
          await emailService.sendWelcomeEmail({ firstName: name, email });
        } else if (subscriber.status === 'unsubscribed') {
          subscriber.status = 'active';
          subscriber.subscribedAt = new Date();
          await subscriber.save();
          logger.info(`Subscriber reactivated: ${email}`);
        }
      } catch (subError) {
        logger.error('Error processing subscription:', subError);
      }
    }

    // Send email notifications using existing email service
    try {
      // Send notification to admin
      const adminHtml = `
        <h1>New Contact Form Submission</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Newsletter:</strong> ${subscribeToNewsletter ? 'Yes' : 'No'}</p>
        <p><small>Received at: ${new Date().toLocaleString()}</small></p>
      `;

      await emailService.sendEmail(
        process.env.CONTACT_EMAIL || 'hello@uzyhomes.com',
        `New Contact: ${service} - ${name}`,
        adminHtml
      );

      // Send auto-reply to user
      const userHtml = `
        <h1>Thank You for Contacting UZYHOMES</h1>
        <p>Hi ${name},</p>
        <p>We've received your message and will respond within 24 hours.</p>
        <p><strong>Your message:</strong></p>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</p>
        <p>In the meantime, you might enjoy:</p>
        <ul>
          <li><a href="${process.env.FRONTEND_URL}/bedding">Browse our Bedding Collection</a></li>
          <li><a href="${process.env.FRONTEND_URL}/decor">Explore Décor Pieces</a></li>
          <li><a href="${process.env.FRONTEND_URL}/interiors">View Interior Design Projects</a></li>
        </ul>
        <p>Warm regards,<br>The UZYHOMES Team</p>
      `;

      await emailService.sendEmail(
        email,
        'Thank You for Contacting UZYHOMES',
        userHtml
      );

    } catch (emailError) {
      logger.error('Error sending contact emails:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully. We\'ll respond within 24 hours.'
    });

  } catch (error) {
    logger.error('Contact submission error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error sending message. Please try again.'
    });
  }
};

/**
 * Subscribe to newsletter
 */
exports.subscribeNewsletter = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Check if already subscribed
    let subscriber = await Subscriber.findOne({ email });

    if (subscriber) {
      if (subscriber.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'This email is already subscribed'
        });
      } else if (subscriber.status === 'unsubscribed') {
        // Reactivate
        subscriber.status = 'active';
        subscriber.subscribedAt = new Date();
        await subscriber.save();
        logger.info(`Subscriber reactivated: ${email}`);

        // Send welcome email
        await emailService.sendWelcomeEmail({ firstName: name || 'there', email });

        return res.json({
          success: true,
          message: 'Subscription reactivated successfully!'
        });
      }
    } else {
      // Create new subscriber
      subscriber = new Subscriber({
        email,
        name: name || '',
        source: 'newsletter',
        ipAddress,
        userAgent
      });

      await subscriber.save();
      logger.info(`New subscriber: ${email}`);

      // Send welcome email
      await emailService.sendWelcomeEmail({ firstName: name || 'there', email });
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter!'
    });

  } catch (error) {
    logger.error('Newsletter subscription error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error subscribing. Please try again.'
    });
  }
};

/**
 * Unsubscribe from newsletter
 */
exports.unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our subscribers list'
      });
    }

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    logger.info(`Subscriber unsubscribed: ${email}`);

    // Render unsubscribe page
    res.render('unsubscribe', {
      title: 'Unsubscribed — UZYHOMES',
      email,
      user: req.user || null
    });

  } catch (error) {
    logger.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsubscribing. Please try again.'
    });
  }
};

/**
 * Get contact messages (Admin only)
 */
exports.getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status) filter.status = status;

    const messages = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);

    res.json({
      success: true,
      messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving messages'
    });
  }
};

/**
 * Update message status (Admin only)
 */
exports.updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const message = await Contact.findByIdAndUpdate(
      id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message
    });

  } catch (error) {
    logger.error('Update message status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating message'
    });
  }
};

/**
 * Get subscribers (Admin only)
 */
exports.getSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'active' } = req.query;
    const skip = (page - 1) * limit;

    const subscribers = await Subscriber.find({ status })
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscriber.countDocuments({ status });

    res.json({
      success: true,
      subscribers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscribers'
    });
  }
};