import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: String,
  password: String,
  companyName: String,
  phone: String,
  status: { type: String, enum: ['pending', 'approved', 'held', 'declined'], default: 'pending' },
  lastActivityAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Vendor', VendorSchema);
