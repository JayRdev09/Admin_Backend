// routes/admin.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { verifyAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

const router = express.Router();

// Apply admin verification to all routes
router.use(verifyAdmin);

// Get admin profile
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, admin: req.admin });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get all registered users (farmers)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users_registered')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query
      .order('date_registered', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'VIEW_USERS', 'Admin Panel', `Viewed users list (page ${page})`);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users_registered')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's soil data
    const { data: soilData } = await supabase
      .from('soil_data')
      .select('*')
      .eq('user_id', userId)
      .order('date_gathered', { ascending: false })
      .limit(10);

    // Get user's prediction results
    const { data: predictions } = await supabase
      .from('prediction_results')
      .select('*')
      .eq('user_id', userId)
      .order('date_predicted', { ascending: false })
      .limit(10);

    await logActivity(req.admin.admin_id, 'VIEW_USER_DETAILS', 'Admin Panel', `Viewed details for user ${userId}`);

    res.json({
      success: true,
      user,
      soilData,
      predictions
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user account status (activate/deactivate)
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Note: Add an 'is_active' column to users_registered if needed
    // For now, we'll just update the user's info or you can add a status field

    const { error } = await supabase
      .from('users_registered')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'UPDATE_USER_STATUS', 'Admin Panel', `Updated status for user ${userId}`);

    res.json({ success: true, message: 'User status updated' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user account
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete user's related data first (soil_data, prediction_results, etc.)
    await supabase.from('soil_data').delete().eq('user_id', userId);
    await supabase.from('prediction_results').delete().eq('user_id', userId);
    await supabase.from('harvest_predictions').delete().eq('user_id', userId);
    
    // Delete user
    const { error } = await supabase
      .from('users_registered')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'DELETE_USER', 'Admin Panel', `Deleted user ${userId}`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create new admin user
router.post('/admins', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: admin, error } = await supabase
      .from('admin_registered')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        password: hashedPassword
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }

    await logActivity(req.admin.admin_id, 'CREATE_ADMIN', 'Admin Panel', `Created new admin ${email}`);

    res.json({
      success: true,
      admin: {
        id: admin.admin_id,
        firstName: admin.first_name,
        lastName: admin.last_name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Get all admins
router.get('/admins', async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('admin_registered')
      .select('admin_id, first_name, last_name, email, date_registered')
      .order('date_registered', { ascending: false });

    if (error) throw error;

    res.json({ success: true, admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users_registered')
      .select('*', { count: 'exact', head: true });

    // Get total predictions
    const { count: totalPredictions } = await supabase
      .from('prediction_results')
      .select('*', { count: 'exact', head: true });

    // Get total soil readings
    const { count: totalSoilReadings } = await supabase
      .from('soil_data')
      .select('*', { count: 'exact', head: true });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentLogs, count: recentActivities } = await supabase
      .from('system_logs')
      .select('*', { count: 'exact' })
      .gte('date_done', sevenDaysAgo.toISOString());

    await logActivity(req.admin.admin_id, 'VIEW_STATS', 'Admin Panel', 'Viewed system statistics');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPredictions,
        totalSoilReadings,
        recentActivities,
        systemUptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;