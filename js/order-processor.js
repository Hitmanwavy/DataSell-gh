// js/order-processor.js - FIXED Order Processing
class OrderProcessor {
    constructor() {
        this.hubnet = hubnetAPI;
    }

    async processOrderAfterPayment(orderData) {
        try {
            console.log('🔄 Processing order after payment...', orderData);
            
            // Extract bundle size (e.g., "1GB MTN Data" -> "1GB")
            const bundleSize = orderData.plan.split(' ')[0];
            
            // Send to REAL HubNet API with retry logic
            const hubnetResult = await this.deliverWithRetry(
                orderData.mtnNumber,
                bundleSize,
                orderData.id
            );

            console.log('📦 HubNet delivery result:', hubnetResult);

            return {
                orderId: orderData.id,
                hubnetResult: hubnetResult,
                success: hubnetResult.success,
                message: hubnetResult.success ? 
                    `Data delivered! Transaction: ${hubnetResult.transactionId}` : 
                    `Delivery failed: ${hubnetResult.error}`,
                transactionId: hubnetResult.transactionId
            };

        } catch (error) {
            console.error('❌ Order processing error:', error);
            return {
                orderId: orderData.id,
                success: false,
                message: `Processing error: ${error.message}`
            };
        }
    }

    // NEW: Retry logic for HubNet delivery
    async deliverWithRetry(mtnNumber, bundleName, orderId, maxRetries = 3) {
        let attempts = 0;
        let lastError = null;

        while (attempts < maxRetries) {
            attempts++;
            try {
                console.log(`🔄 Delivery attempt ${attempts}/${maxRetries} for order ${orderId}`);
                
                const hubnetResult = await this.hubnet.placeDataOrder(
                    mtnNumber,
                    bundleName,
                    orderId + (attempts > 1 ? `-RETRY-${attempts}` : '')
                );

                if (hubnetResult.success) {
                    console.log(`✅ Delivery successful on attempt ${attempts}`);
                    return hubnetResult;
                } else {
                    lastError = hubnetResult.error;
                    console.log(`❌ Delivery attempt ${attempts} failed:`, hubnetResult.error);
                    
                    if (attempts < maxRetries) {
                        // Wait before retry (exponential backoff)
                        const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
                        console.log(`⏳ Waiting ${delay}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            } catch (error) {
                lastError = error.message;
                console.error(`❌ Delivery attempt ${attempts} error:`, error);
                
                if (attempts < maxRetries) {
                    // Wait before retry
                    const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All attempts failed
        throw new Error(`All ${maxRetries} delivery attempts failed. Last error: ${lastError}`);
    }

    // NEW: Quick delivery status check
    async checkDeliveryStatus(orderId) {
        try {
            // This would typically call a HubNet status endpoint
            // For now, we'll check local storage
            const orders = JSON.parse(localStorage.getItem('userOrders')) || [];
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                return { success: false, error: 'Order not found' };
            }

            return {
                success: true,
                status: order.status || 'unknown',
                delivered: order.status === 'delivered',
                transactionId: order.hubnetTransactionId,
                deliveredAt: order.deliveredAt
            };
        } catch (error) {
            console.error('Status check error:', error);
            return { success: false, error: error.message };
        }
    }

    async validateOrder(mtnNumber, bundleName) {
        const errors = [];
        
        // Validate MTN number
        if (!mtnNumber || !/^0[0-9]{9}$/.test(mtnNumber)) {
            errors.push('Invalid MTN number format. Must be 10 digits starting with 0');
        }
        
        // Validate bundle
        const validBundles = ['100MB', '300MB', '500MB', '1GB', '2GB', '3GB', '4GB', '5GB', '10GB'];
        if (!validBundles.includes(bundleName)) {
            errors.push('Invalid data bundle selected');
        }

        // Validate network (must be MTN)
        if (mtnNumber && !mtnNumber.startsWith('024') && !mtnNumber.startsWith('054') && !mtnNumber.startsWith('055') && !mtnNumber.startsWith('059')) {
            errors.push('Number must be a valid MTN Ghana number (024, 054, 055, 059)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // NEW: Process bulk orders
    async processBulkOrders(orders) {
        const results = [];
        
        for (const order of orders) {
            try {
                console.log(`Processing bulk order: ${order.mtnNumber} - ${order.plan}`);
                
                const result = await this.processOrderAfterPayment(order);
                results.push(result);
                
                // Small delay between bulk orders to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Bulk order failed for ${order.mtnNumber}:`, error);
                results.push({
                    orderId: order.id,
                    success: false,
                    message: `Bulk processing failed: ${error.message}`
                });
            }
        }
        
        return results;
    }

    // NEW: Get order statistics
    getOrderStats() {
        try {
            const orders = JSON.parse(localStorage.getItem('userOrders')) || [];
            const adminOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
            
            const totalOrders = orders.length;
            const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
            const failedOrders = orders.filter(o => o.status === 'delivery_failed').length;
            const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid').length;
            
            const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);
            
            return {
                totalOrders,
                deliveredOrders,
                failedOrders,
                pendingOrders,
                successRate: totalOrders > 0 ? (deliveredOrders / totalOrders * 100).toFixed(2) : 0,
                totalRevenue: totalRevenue.toFixed(2),
                recentOrders: orders.slice(-5).reverse() // Last 5 orders
            };
        } catch (error) {
            console.error('Error getting order stats:', error);
            return {
                totalOrders: 0,
                deliveredOrders: 0,
                failedOrders: 0,
                pendingOrders: 0,
                successRate: 0,
                totalRevenue: '0.00',
                recentOrders: []
            };
        }
    }
}

// Create global instance
const orderProcessor = new OrderProcessor();