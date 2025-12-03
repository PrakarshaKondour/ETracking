import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/admin.js';
import Customer from './models/customer.js';
import Vendor from './models/vendor.js';
import Order from './models/Order.js';

dotenv.config();

// Use the same database as the server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eCommerceDB';

// Sample data - 5 clothing vendors
const vendors = [
    { username: 'fashionista', email: 'contact@fashionista.com', password: 'vendor123', companyName: 'Fashionista Boutique', phone: '+1-555-2001', status: 'approved' },
    { username: 'urbanwear', email: 'info@urbanwear.com', password: 'vendor123', companyName: 'Urban Wear Co', phone: '+1-555-2002', status: 'approved' },
    { username: 'classicstyle', email: 'sales@classicstyle.com', password: 'vendor123', companyName: 'Classic Style Ltd', phone: '+1-555-2003', status: 'approved' },
    { username: 'trendyapparel', email: 'support@trendyapparel.com', password: 'vendor123', companyName: 'Trendy Apparel Inc', phone: '+1-555-2004', status: 'approved' },
    { username: 'elegantfashion', email: 'hello@elegantfashion.com', password: 'vendor123', companyName: 'Elegant Fashion House', phone: '+1-555-2005', status: 'approved' }
];

// 5 customers
const customers = [
    { username: 'sarah_jones', email: 'sarah@example.com', password: 'customer123', fullName: 'Sarah Jones', address: '100 Fashion Ave, NYC', phone: '+1-555-3001' },
    { username: 'mike_taylor', email: 'mike@example.com', password: 'customer123', fullName: 'Mike Taylor', address: '200 Style St, LA', phone: '+1-555-3002' },
    { username: 'emma_davis', email: 'emma@example.com', password: 'customer123', fullName: 'Emma Davis', address: '300 Trend Blvd, Chicago', phone: '+1-555-3003' },
    { username: 'james_wilson', email: 'james@example.com', password: 'customer123', fullName: 'James Wilson', address: '400 Chic Lane, Miami', phone: '+1-555-3004' },
    { username: 'olivia_brown', email: 'olivia@example.com', password: 'customer123', fullName: 'Olivia Brown', address: '500 Vogue Dr, Seattle', phone: '+1-555-3005' }
];

// Clothing products
const clothingProducts = [
    { name: 'Designer Dress', minPrice: 80, maxPrice: 300 },
    { name: 'Casual T-Shirt', minPrice: 20, maxPrice: 50 },
    { name: 'Denim Jeans', minPrice: 40, maxPrice: 120 },
    { name: 'Leather Jacket', minPrice: 150, maxPrice: 400 },
    { name: 'Summer Dress', minPrice: 60, maxPrice: 180 },
    { name: 'Formal Shirt', minPrice: 35, maxPrice: 90 },
    { name: 'Yoga Pants', minPrice: 30, maxPrice: 80 },
    { name: 'Winter Coat', minPrice: 120, maxPrice: 350 },
    { name: 'Sneakers', minPrice: 50, maxPrice: 200 },
    { name: 'Handbag', minPrice: 60, maxPrice: 250 }
];

// Generate 20 orders
function generateOrders() {
    const orders = [];
    const statuses = ['ordered', 'processing', 'packing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];
    const now = new Date();

    for (let i = 0; i < 20; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];

        // Random date within last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const orderDate = new Date(now);
        orderDate.setDate(orderDate.getDate() - daysAgo);

        // 1-2 items per order
        const itemCount = Math.floor(Math.random() * 2) + 1;
        const items = [];
        let total = 0;

        for (let j = 0; j < itemCount; j++) {
            const product = clothingProducts[Math.floor(Math.random() * clothingProducts.length)];
            const qty = Math.floor(Math.random() * 2) + 1;
            const price = Math.floor(Math.random() * (product.maxPrice - product.minPrice) + product.minPrice);

            items.push({
                name: product.name,
                qty: qty,
                price: price
            });

            total += qty * price;
        }

        // Status based on order age
        let status;
        if (daysAgo > 20) {
            status = 'delivered';
        } else if (daysAgo > 10) {
            status = statuses[Math.floor(Math.random() * 5) + 2]; // processing to out_for_delivery
        } else {
            status = statuses[Math.floor(Math.random() * 3)]; // ordered to packing
        }

        orders.push({
            customerUsername: customer.username,
            vendorUsername: vendor.username,
            items: items,
            total: total,
            status: status,
            createdAt: orderDate,
            updatedAt: orderDate
        });
    }

    return orders;
}

async function seedDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log('📍 Database:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await Customer.deleteMany({});
        await Vendor.deleteMany({});
        await Order.deleteMany({});
        console.log('✅ Existing data cleared');

        // Insert customers
        console.log('👥 Creating 5 customers...');
        await Customer.insertMany(customers);
        console.log('✅ Created 5 customers');

        // Insert vendors
        console.log('🏪 Creating 5 clothing vendors...');
        await Vendor.insertMany(vendors);
        console.log('✅ Created 5 vendors');

        // Generate and insert orders
        console.log('📦 Creating 20 orders...');
        const orders = generateOrders();
        await Order.insertMany(orders);
        console.log('✅ Created 20 orders');

        console.log('\n🎉 Database seeded successfully!\n');

        // Print credentials
        console.log('═══════════════════════════════════════════════════════');
        console.log('              CLOTHING STORE CREDENTIALS               ');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('👥 CUSTOMERS (password: customer123):');
        customers.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.username} - ${c.fullName}`);
        });

        console.log('\n🏪 CLOTHING VENDORS (password: vendor123):');
        vendors.forEach((v, i) => {
            console.log(`   ${i + 1}. ${v.username} - ${v.companyName}`);
        });

        console.log('\n═══════════════════════════════════════════════════════\n');

        // Print summary
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$total' }
                }
            }
        ]);

        console.log('📊 ORDER STATISTICS:');
        stats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count} orders, $${stat.totalRevenue.toFixed(2)}`);
        });

        const totalRevenue = stats.reduce((sum, stat) => sum + stat.totalRevenue, 0);
        console.log(`\n   TOTAL: 20 orders, $${totalRevenue.toFixed(2)}\n`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

seedDatabase();
