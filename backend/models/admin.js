const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: String,
  password: String,
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);