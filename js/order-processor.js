// js/order-processor.js - Real Order Processing
class OrderProcessor {
    constructor() {
        this.hubnet = hubnetAPI;
    }

    async processOrderAfterPayment(orderData) {
        try {
            console.log('🔄 Processing order after payment...', orderData);
            
            // Extract bundle size (e.g., "1GB MTN Data" -> "1GB")
            const bundleSize = orderData.plan.split(' ')[0];
            
            // Send to REAL HubNet API
            const hubnetResult = await this.hubnet.placeDataOrder(
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
                    `Delivery failed: ${hubnetResult.error}`
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

    async validateOrder(mtnNumber, bundleName) {
        const errors = [];
        
        // Validate MTN number
        if (!mtnNumber || !/^0[0-9]{9}$/.test(mtnNumber)) {
            errors.push('Invalid MTN number format');
        }
        
        // Validate bundle
        const validBundles = ['1GB', '2GB', '3GB', '5GB', '10GB'];
        if (!validBundles.includes(bundleName)) {
            errors.push('Invalid data bundle selected');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Create global instance
const orderProcessor = new OrderProcessor();