import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: String,
  password: String,
  fullName: String,
  address: String,
  phone: String,
}, { timestamps: true });

export default mongoose.model('Customer', CustomerSchema);
