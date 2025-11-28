import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: String,
  password: String,
}, { timestamps: true });

export default mongoose.model('Admin', AdminSchema);
