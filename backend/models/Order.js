import mongoose from 'mongoose';
import { ORDER_STATUS_ENUM } from "../constants/orderStatus.js";

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
    status: {
    type: String,
    enum: ORDER_STATUS_ENUM,
    default: "ordered",
  },
}, { timestamps: true });

export default mongoose.model('Order', OrderSchema);
