const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customerUsername: { type: String, required: true },
  vendorUsername: { type: String, required: true },
  items: [{ name: String, qty: Number, price: Number }],
  total: Number,
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);