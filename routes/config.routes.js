// routes/config.routes.js
const express = require('express');
const supabase = require('../config/supabase');
const { verifyAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

const router = express.Router();

router.use(verifyAdmin);

// ==================== DISEASE RECOMMENDATIONS ====================

// Get all disease recommendations
router.get('/disease-recommendations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('disease_recommendations')
      .select('*')
      .order('disease_name');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching disease recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch disease recommendations' });
  }
});

// Create disease recommendation
router.post('/disease-recommendations', async (req, res) => {
  try {
    const { disease_name, recommendation, severity, is_active } = req.body;

    if (!disease_name || !recommendation) {
      return res.status(400).json({ error: 'Disease name and recommendation are required' });
    }

    const { data, error } = await supabase
      .from('disease_recommendations')
      .insert({
        disease_name,
        recommendation,
        severity: severity || 'Moderate',
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Disease already exists' });
      }
      throw error;
    }

    await logActivity(req.admin.admin_id, 'CREATE_DISEASE_REC', 'Config', `Created recommendation for ${disease_name}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating disease recommendation:', error);
    res.status(500).json({ error: 'Failed to create disease recommendation' });
  }
});

// Update disease recommendation
router.put('/disease-recommendations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { disease_name, recommendation, severity, is_active } = req.body;

    const updateData = {};
    if (disease_name !== undefined) updateData.disease_name = disease_name;
    if (recommendation !== undefined) updateData.recommendation = recommendation;
    if (severity !== undefined) updateData.severity = severity;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('disease_recommendations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'UPDATE_DISEASE_REC', 'Config', `Updated recommendation for ID ${id}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating disease recommendation:', error);
    res.status(500).json({ error: 'Failed to update disease recommendation' });
  }
});

// Delete disease recommendation
router.delete('/disease-recommendations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('disease_recommendations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'DELETE_DISEASE_REC', 'Config', `Deleted recommendation ID ${id}`);

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting disease recommendation:', error);
    res.status(500).json({ error: 'Failed to delete disease recommendation' });
  }
});

// ==================== SOIL RECOMMENDATIONS ====================

// Get all soil recommendations
router.get('/soil-recommendations', async (req, res) => {
  try {
    const { parameter, crop_type } = req.query;
    
    let query = supabase.from('soil_recommendations').select('*');
    
    if (parameter) query = query.eq('parameter', parameter);
    if (crop_type) query = query.eq('crop_type', crop_type);
    
    const { data, error } = await query.order('parameter').order('severity');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching soil recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch soil recommendations' });
  }
});

// Create soil recommendation
router.post('/soil-recommendations', async (req, res) => {
  try {
    const { parameter, condition_type, recommendation, severity, crop_type, is_active } = req.body;

    if (!parameter || !condition_type || !recommendation) {
      return res.status(400).json({ error: 'Parameter, condition type, and recommendation are required' });
    }

    const { data, error } = await supabase
      .from('soil_recommendations')
      .insert({
        parameter,
        condition_type,
        recommendation,
        severity: severity || 'Warning',
        crop_type: crop_type || 'tomato',
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Recommendation for this parameter and condition already exists' });
      }
      throw error;
    }

    await logActivity(req.admin.admin_id, 'CREATE_SOIL_REC', 'Config', `Created recommendation for ${parameter} - ${condition_type}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating soil recommendation:', error);
    res.status(500).json({ error: 'Failed to create soil recommendation' });
  }
});

// Update soil recommendation
router.put('/soil-recommendations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { parameter, condition_type, recommendation, severity, crop_type, is_active } = req.body;

    const updateData = {};
    if (parameter !== undefined) updateData.parameter = parameter;
    if (condition_type !== undefined) updateData.condition_type = condition_type;
    if (recommendation !== undefined) updateData.recommendation = recommendation;
    if (severity !== undefined) updateData.severity = severity;
    if (crop_type !== undefined) updateData.crop_type = crop_type;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('soil_recommendations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'UPDATE_SOIL_REC', 'Config', `Updated soil recommendation ID ${id}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating soil recommendation:', error);
    res.status(500).json({ error: 'Failed to update soil recommendation' });
  }
});

// Delete soil recommendation
router.delete('/soil-recommendations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('soil_recommendations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'DELETE_SOIL_REC', 'Config', `Deleted soil recommendation ID ${id}`);

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting soil recommendation:', error);
    res.status(500).json({ error: 'Failed to delete soil recommendation' });
  }
});

// ==================== OPTIMAL RANGES ====================

// Get all optimal ranges
router.get('/optimal-ranges', async (req, res) => {
  try {
    const { crop_type } = req.query;
    
    let query = supabase.from('optimal_ranges').select('*');
    
    if (crop_type) query = query.eq('crop_type', crop_type);
    
    const { data, error } = await query.order('parameter');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching optimal ranges:', error);
    res.status(500).json({ error: 'Failed to fetch optimal ranges' });
  }
});

// Create or update optimal range
router.post('/optimal-ranges', async (req, res) => {
  try {
    const { crop_type, parameter, optimal_min, optimal_max, unit } = req.body;

    if (!crop_type || !parameter || optimal_min === undefined || optimal_max === undefined) {
      return res.status(400).json({ error: 'Crop type, parameter, min, and max are required' });
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('optimal_ranges')
      .select('range_id')
      .eq('crop_type', crop_type)
      .eq('parameter', parameter)
      .single();

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('optimal_ranges')
        .update({
          optimal_min,
          optimal_max,
          unit,
          updated_at: new Date().toISOString()
        })
        .eq('range_id', existing.range_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('optimal_ranges')
        .insert({
          crop_type,
          parameter,
          optimal_min,
          optimal_max,
          unit
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    await logActivity(req.admin.admin_id, 'UPDATE_OPTIMAL_RANGE', 'Config', `Updated range for ${parameter}`);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating optimal range:', error);
    res.status(500).json({ error: 'Failed to update optimal range' });
  }
});

// Delete optimal range
router.delete('/optimal-ranges/:rangeId', async (req, res) => {
  try {
    const { rangeId } = req.params;

    const { error } = await supabase
      .from('optimal_ranges')
      .delete()
      .eq('range_id', rangeId);

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'DELETE_OPTIMAL_RANGE', 'Config', `Deleted optimal range ID ${rangeId}`);

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting optimal range:', error);
    res.status(500).json({ error: 'Failed to delete optimal range' });
  }
});

// ==================== FUSION THRESHOLDS ====================

// Get all fusion thresholds
router.get('/fusion-thresholds', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fusion_thresholds')
      .select('*')
      .order('threshold_name');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching fusion thresholds:', error);
    res.status(500).json({ error: 'Failed to fetch fusion thresholds' });
  }
});

// Update fusion threshold
router.put('/fusion-thresholds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { threshold_value, description, is_active } = req.body;

    if (threshold_value === undefined) {
      return res.status(400).json({ error: 'Threshold value is required' });
    }

    const { data, error } = await supabase
      .from('fusion_thresholds')
      .update({
        threshold_value,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'UPDATE_FUSION_THRESHOLD', 'Config', `Updated threshold ID ${id}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating fusion threshold:', error);
    res.status(500).json({ error: 'Failed to update fusion threshold' });
  }
});

// ==================== FUSION WEIGHTS ====================

// Get all fusion weights
router.get('/fusion-weights', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fusion_weights')
      .select('*')
      .order('weight_name');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching fusion weights:', error);
    res.status(500).json({ error: 'Failed to fetch fusion weights' });
  }
});

// Update fusion weight
router.put('/fusion-weights/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { weight_value, description, is_active } = req.body;

    if (weight_value === undefined) {
      return res.status(400).json({ error: 'Weight value is required' });
    }

    if (weight_value < 0 || weight_value > 1) {
      return res.status(400).json({ error: 'Weight must be between 0 and 1' });
    }

    const { data, error } = await supabase
      .from('fusion_weights')
      .update({
        weight_value,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'UPDATE_FUSION_WEIGHT', 'Config', `Updated weight ID ${id}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating fusion weight:', error);
    res.status(500).json({ error: 'Failed to update fusion weight' });
  }
});

// ==================== SOIL QUALITY THRESHOLDS ====================

// Get soil quality thresholds
router.get('/soil-quality-thresholds', async (req, res) => {
  try {
    const { crop_type = 'tomato' } = req.query;
    
    const { data, error } = await supabase
      .from('soil_quality_thresholds')
      .select('*')
      .eq('crop_type', crop_type)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error('Error fetching soil quality thresholds:', error);
    res.status(500).json({ error: 'Failed to fetch soil quality thresholds' });
  }
});

// Create or update soil quality thresholds
router.post('/soil-quality-thresholds', async (req, res) => {
  try {
    const { crop_type, thresholds, labels } = req.body;

    if (!crop_type || !thresholds || !labels) {
      return res.status(400).json({ error: 'Crop type, thresholds, and labels are required' });
    }

    if (thresholds.length !== labels.length - 1) {
      return res.status(400).json({ error: 'Number of thresholds should be one less than number of labels' });
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('soil_quality_thresholds')
      .select('id')
      .eq('crop_type', crop_type)
      .single();

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('soil_quality_thresholds')
        .update({
          thresholds,
          labels,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('soil_quality_thresholds')
        .insert({
          crop_type,
          thresholds,
          labels
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    await logActivity(req.admin.admin_id, 'UPDATE_SOIL_QUALITY_THRESHOLDS', 'Config', `Updated thresholds for ${crop_type}`);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating soil quality thresholds:', error);
    res.status(500).json({ error: 'Failed to update soil quality thresholds' });
  }
});

// ==================== TOMATO PREDICTION THRESHOLDS ====================

// Get tomato prediction thresholds
router.get('/tomato-thresholds', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tomato_prediction_thresholds')
      .select('*')
      .order('threshold_name');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching tomato thresholds:', error);
    res.status(500).json({ error: 'Failed to fetch tomato thresholds' });
  }
});

// Update tomato prediction threshold
router.put('/tomato-thresholds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { threshold_value, description, is_active } = req.body;

    if (threshold_value === undefined) {
      return res.status(400).json({ error: 'Threshold value is required' });
    }

    const { data, error } = await supabase
      .from('tomato_prediction_thresholds')
      .update({
        threshold_value,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.admin.admin_id, 'UPDATE_TOMATO_THRESHOLD', 'Config', `Updated tomato threshold ID ${id}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating tomato threshold:', error);
    res.status(500).json({ error: 'Failed to update tomato threshold' });
  }
});

module.exports = router;