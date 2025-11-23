const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: String,
  password: String,
  fullName: String,
  address: String,
  phone: String,
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);