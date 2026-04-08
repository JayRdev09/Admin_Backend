// middleware/logger.js
const supabase = require('../config/supabase');

const logActivity = async (userId, actionType, moduleSource, statusMessage) => {
  try {
    await supabase
      .from('system_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        module_source: moduleSource,
        status_message: statusMessage,
        date_done: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

module.exports = { logActivity };