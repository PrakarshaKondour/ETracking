import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  customerUsername: { type: String, required: true },
  vendorUsername: { type: String, required: true },
  items: [
    {
      name: String,
      qty: Number,
      price: Number
    }
  ],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('Order', OrderSchema);
