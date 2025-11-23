const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: String,
  password: String,
  companyName: String,
  phone: String,
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);