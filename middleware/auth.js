// middleware/auth.js
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if admin exists in database
    const { data: admin, error } = await supabase
      .from('admin_registered')
      .select('admin_id, email, first_name, last_name')
      .eq('admin_id', decoded.adminId)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid token or admin not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = { verifyAdmin, JWT_SECRET };