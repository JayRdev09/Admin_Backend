// routes/system.routes.js
const express = require('express');
const supabase = require('../config/supabase');
const { verifyAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

const router = express.Router();

router.use(verifyAdmin);

// Get system logs with filters
router.get('/logs', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      actionType, 
      moduleSource,
      startDate,
      endDate,
      userId 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('system_logs')
      .select('*, users_registered!system_logs_user_id_fkey(email, first_name, last_name)', { count: 'exact' });

    // Apply filters
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (moduleSource) {
      query = query.eq('module_source', moduleSource);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('date_done', startDate);
    }
    if (endDate) {
      query = query.lte('date_done', endDate);
    }

    const { data: logs, error, count } = await query
      .order('date_done', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get distinct action types and module sources for filters
    const { data: actionTypes } = await supabase
      .from('system_logs')
      .select('action_type')
      .not('action_type', 'is', null);

    const { data: moduleSources } = await supabase
      .from('system_logs')
      .select('module_source')
      .not('module_source', 'is', null);

    const uniqueActionTypes = [...new Set(actionTypes?.map(l => l.action_type) || [])];
    const uniqueModuleSources = [...new Set(moduleSources?.map(l => l.module_source) || [])];

    await logActivity(req.admin.admin_id, 'VIEW_LOGS', 'System', `Viewed system logs (page ${page})`);

    res.json({
      success: true,
      logs,
      filters: {
        actionTypes: uniqueActionTypes,
        moduleSources: uniqueModuleSources
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Get system health metrics
router.get('/health', async (req, res) => {
  try {
    // Get last 24 hours activity
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count: last24hActivities } = await supabase
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .gte('date_done', oneDayAgo.toISOString());

    // Get error logs count
    const { count: errorLogs } = await supabase
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .ilike('status_message', '%error%')
      .gte('date_done', oneDayAgo.toISOString());

    res.json({
      success: true,
      metrics: {
        status: 'healthy',
        uptime: process.uptime(),
        last24hActivities,
        errorLogs24h: errorLogs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    res.status(500).json({ error: 'Failed to fetch health metrics' });
  }
});

// Clear old logs (older than specified days)
router.delete('/logs/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data: deleted, error } = await supabase
      .from('system_logs')
      .delete()
      .lt('date_done', cutoffDate.toISOString())
      .select();

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'CLEANUP_LOGS', 'System', `Deleted ${deleted?.length || 0} old logs`);

    res.json({
      success: true,
      message: `Deleted ${deleted?.length || 0} logs older than ${daysToKeep} days`
    });
  } catch (error) {
    console.error('Error cleaning logs:', error);
    res.status(500).json({ error: 'Failed to clean up logs' });
  }
});

module.exports = router;