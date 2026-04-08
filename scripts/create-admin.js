// scripts/create-admin.js - Run this to create an initial admin user
require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

async function createAdmin() {
  const email = 'admin@tomatoai.com';
  const password = 'Admin@123';
  const firstName = 'System';
  const lastName = 'Administrator';

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('admin_registered')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: hashedPassword
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.log('Admin already exists!');
    } else {
      console.error('Error creating admin:', error);
    }
  } else {
    console.log('Admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
  }
}

createAdmin();