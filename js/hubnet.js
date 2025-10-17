// js/hubnet.js - UPDATED WITH PBMDataHub PROVEN METHOD
class HubNetAPI {
    constructor() {
        this.apiKey = "gOXXy0YSNd5CXZa4v568wuwbB70E8czAnM9";
        this.baseURL = 'https://console.hubnet.app/api/context/business/transaction';
        this.balanceURL = 'https://console.hubnet.app/api/context/business/transaction/check_balance';
    }

    getVolumeFromBundle(bundleName) {
        const volumeMap = {
            '100MB': '100',
            '300MB': '300', 
            '500MB': '500',
            '1GB': '1024',
            '2GB': '2048', 
            '3GB': '3072',
            '4GB': '4096',
            '5GB': '5120',
            '10GB': '10240'
        };
        return volumeMap[bundleName] || '1024';
    }

    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            // Clean and format phone number (PBMDataHub method)
            let cleanNumber = mtnNumber.toString().trim();
            
            // Remove spaces and ensure proper format
            cleanNumber = cleanNumber.replace(/\s/g, '');
            
            // Convert to 233 format if it starts with 0
            if (cleanNumber.startsWith('0')) {
                cleanNumber = '233' + cleanNumber.substring(1);
            }
            
            // Ensure it starts with 233
            if (!cleanNumber.startsWith('233')) {
                cleanNumber = '233' + cleanNumber;
            }

            const volume = this.getVolumeFromBundle(bundleName);
            
            // PBMDataHub payload structure
            const payload = {
                "phone": cleanNumber,
                "volume": volume,
                "reference": reference || `DSG-${Date.now()}`,
                "referrer": cleanNumber
            };

            console.log('📤 Sending to HubNet:', payload);

            const response = await fetch(`${this.baseURL}/mtn-new-transaction`, {
                method: 'POST',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // Check response status first
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📥 HubNet Response:', result);

            // PBMDataHub success response pattern
            if (result.status === true && result.code === "0000") {
                return {
                    success: true,
                    message: result.message || 'Data delivered successfully',
                    transactionId: result.transaction_id || result.data?.transaction_id,
                    reference: result.reference
                };
            } else {
                // Extract error message from HubNet response
                let errorMsg = result.reason || result.message || 'Delivery failed. Please try again.';
                
                // Handle specific error codes
                if (result.code === "1001") errorMsg = "Insufficient balance";
                if (result.code === "1002") errorMsg = "Invalid phone number";
                if (result.code === "1003") errorMsg = "Service temporarily unavailable";
                
                return {
                    success: false,
                    error: errorMsg,
                    code: result.code
                };
            }

        } catch (error) {
            console.error('🚨 HubNet Delivery Error:', error);
            return {
                success: false,
                error: error.message || 'Network error. Please check your connection.'
            };
        }
    }

    async checkBalance() {
        try {
            const response = await fetch(this.balanceURL, {
                method: 'GET',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('💰 Balance Response:', result);
            
            let balance = 0;
            
            // PBMDataHub balance response structure
            if (result.data && result.data.wallet_balance !== undefined) {
                balance = result.data.wallet_balance;
            } else if (result.balance !== undefined) {
                balance = result.balance;
            } else if (result.available_balance !== undefined) {
                balance = result.available_balance;
            } else if (result.data?.available_balance !== undefined) {
                balance = result.data.available_balance;
            }

            return {
                success: true,
                available_balance: parseFloat(balance) || 0,
                currency: 'GHS',
                rawResponse: result
            };

        } catch (error) {
            console.error('❌ Balance check error:', error);
            return {
                success: false,
                error: error.message,
                available_balance: 0
            };
        }
    }

    async testConnection() {
        try {
            const balance = await this.checkBalance();
            if (balance.success) {
                return {
                    connected: true,
                    message: `✅ HubNet Connected | Balance: GHS ${balance.available_balance.toFixed(2)}`,
                    balance: balance.available_balance,
                    rawData: balance.rawResponse
                };
            } else {
                return {
                    connected: false,
                    message: `❌ Connection failed: ${balance.error}`
                };
            }
        } catch (error) {
            return {
                connected: false,
                message: `❌ Test failed: ${error.message}`
            };
        }
    }

    // New: Validate phone number format (PBMDataHub method)
    validatePhoneNumber(phone) {
        const cleaned = phone.toString().replace(/\s/g, '');
        
        // Accepts: 233XXXXXXXXX, 0XXXXXXXXX, +233XXXXXXXXX
        const regex = /^(233|0|\+233)\d{9}$/;
        
        if (!regex.test(cleaned)) {
            return {
                valid: false,
                error: 'Invalid phone number format. Use: 0234567890 or 233234567890'
            };
        }
        
        return {
            valid: true,
            cleaned: cleaned.startsWith('0') ? '233' + cleaned.substring(1) : cleaned.replace('+233', '233')
        };
    }
}

const hubnetAPI = new HubNetAPI();