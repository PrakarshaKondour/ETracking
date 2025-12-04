import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: "Invalid email format"
    }
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    // validate: {
    //   validator: function (v) {
    //     return /^[6-9]\d{9}$/.test(v);  // Indian number validation
    //   },
    //   message: "Invalid Indian phone number"
    // }
  },
  fullName: String,
  address: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: String,
  otpExpires: Date,
}, { timestamps: true });

export default mongoose.model('Customer', CustomerSchema);
