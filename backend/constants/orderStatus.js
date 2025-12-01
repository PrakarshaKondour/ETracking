// backend/constants/orderStatus.js

export const ORDER_STATUS_FLOW = [
  "ordered",
  "processing",
  "packing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

// Same list, just reused for validation
export const ORDER_STATUS_ENUM = [...ORDER_STATUS_FLOW];

// Optional: pretty labels for API responses / logs
export const ORDER_STATUS_LABELS = {
  ordered: "Ordered",
  processing: "Processing",
  packing: "Packing",
  shipped: "Shipped",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};
