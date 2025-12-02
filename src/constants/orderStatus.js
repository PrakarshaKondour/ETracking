// src/constants/orderStatus.js

export const ORDER_STATUS_FLOW = [
  "ordered",
  "processing",
  "packing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

export const PRETTY_STATUS = (status) => {
  const s = status || "ordered";
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};