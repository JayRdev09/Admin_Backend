// routes/user.routes.js
const express = require('express');
const supabase = require('../config/supabase');
const { verifyAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

const router = express.Router();

router.use(verifyAdmin);

// Get all users with their latest soil and prediction data
router.get('/with-data', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get users
    const { data: users, error: usersError, count } = await supabase
      .from('users_registered')
      .select('*', { count: 'exact' })
      .order('date_registered', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) throw usersError;

    // Get latest data for each user
    const usersWithData = await Promise.all(users.map(async (user) => {
      // Get latest soil data
      const { data: latestSoil } = await supabase
        .from('soil_data')
        .select('*')
        .eq('user_id', user.user_id)
        .order('date_gathered', { ascending: false })
        .limit(1);

      // Get latest prediction
      const { data: latestPrediction } = await supabase
        .from('prediction_results')
        .select('*')
        .eq('user_id', user.user_id)
        .order('date_predicted', { ascending: false })
        .limit(1);

      return {
        ...user,
        latestSoil: latestSoil?.[0] || null,
        latestPrediction: latestPrediction?.[0] || null
      };
    }));

    res.json({
      success: true,
      users: usersWithData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users with data:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;