// routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { logActivity } = require('../middleware/logger');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get admin from database
    const { data: admin, error } = await supabase
      .from('admin_registered')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { adminId: admin.admin_id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log login activity
    await logActivity(null, 'LOGIN', 'Admin Auth', `Admin ${admin.email} logged in`);

    res.json({
      success: true,
      token,
      admin: {
        id: admin.admin_id,
        firstName: admin.first_name,
        lastName: admin.last_name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change Password
router.post('/admin/change-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get admin
    const { data: admin, error } = await supabase
      .from('admin_registered')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('admin_registered')
      .update({ password: hashedPassword })
      .eq('admin_id', admin.admin_id);

    if (updateError) {
      throw updateError;
    }

    await logActivity(null, 'PASSWORD_CHANGE', 'Admin Auth', `Admin ${email} changed password`);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;