import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// Custom business metrics

// Counter: Total orders created
export const ordersTotal = new client.Counter({
    name: 'etracking_orders_total',
    help: 'Total number of orders created',
    labelNames: ['status', 'vendor'],
    registers: [register],
});

// Gauge: Current orders by status
export const ordersByStatus = new client.Gauge({
    name: 'etracking_orders_by_status',
    help: 'Number of orders grouped by status',
    labelNames: ['status'],
    registers: [register],
});

// Gauge: Orders by vendor
export const ordersByVendor = new client.Gauge({
    name: 'etracking_orders_by_vendor',
    help: 'Number of orders per vendor',
    labelNames: ['vendor'],
    registers: [register],
});

// Counter: Total revenue
export const revenueTotal = new client.Counter({
    name: 'etracking_revenue_total',
    help: 'Total revenue from all orders',
    labelNames: ['vendor'],
    registers: [register],
});

// Gauge: Revenue by vendor
export const revenueByVendor = new client.Gauge({
    name: 'etracking_revenue_by_vendor',
    help: 'Revenue per vendor',
    labelNames: ['vendor'],
    registers: [register],
});

// Histogram: HTTP request duration
export const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register],
});

// Counter: HTTP requests total
export const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

// Helper function to update order metrics from database
export async function updateOrderMetrics(Order) {
    try {
        // Get all orders
        const orders = await Order.find({});

        // Reset gauges
        ordersByStatus.reset();
        ordersByVendor.reset();
        revenueByVendor.reset();

        // Count by status
        const statusCounts = {};
        const vendorCounts = {};
        const vendorRevenue = {};

        orders.forEach(order => {
            // Status counts
            const status = order.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;

            // Vendor counts
            const vendor = order.vendorUsername || 'unknown';
            vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;

            // Vendor revenue
            const revenue = Number(order.total) || 0;
            vendorRevenue[vendor] = (vendorRevenue[vendor] || 0) + revenue;
        });

        // Update gauges
        Object.entries(statusCounts).forEach(([status, count]) => {
            ordersByStatus.set({ status }, count);
        });

        Object.entries(vendorCounts).forEach(([vendor, count]) => {
            ordersByVendor.set({ vendor }, count);
        });

        Object.entries(vendorRevenue).forEach(([vendor, revenue]) => {
            revenueByVendor.set({ vendor }, revenue);
        });

        console.log('📊 Prometheus metrics updated');
    } catch (error) {
        console.error('❌ Error updating Prometheus metrics:', error);
    }
}

export { register };
