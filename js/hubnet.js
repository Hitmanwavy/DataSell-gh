// js/hubnet.js - FIXED HubNet API Integration (Using Official Documentation)
class HubNetAPI {
    constructor() {
        this.apiKey = "gOXXy0YSNd5CXZa4v568wuwbB70E8czAnM9";
        this.baseURL = 'https://console.hubnet.app/live/api/context/business/transaction';
        this.balanceURL = 'https://console.hubnet.app/live/api/context/business/transaction/check_balance';
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

    // FIXED: REAL HubNet API call using CORRECT documentation
    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            console.log('🚀 Sending REAL order to HubNet...');
            
            const volume = this.getVolumeFromBundle(bundleName);
            
            // CORRECT PAYLOAD FORMAT from documentation
            const payload = {
                "phone": mtnNumber,
                "volume": volume,
                "reference": reference,
                "referrer": mtnNumber // Using same number as referrer
                // "webhook": "https://your-webhook/url" // Optional
            };

            console.log('📤 HubNet Payload:', payload);

            // CORRECT ENDPOINT from documentation
            const endpoint = `${this.baseURL}/mtn-new-transaction`;
            console.log('🔗 Using endpoint:', endpoint);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('📥 HubNet Response Status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ HubNet API Response:', result);

            // CORRECT RESPONSE HANDLING from documentation
            if (result.status === true && result.code === "0000") {
                return {
                    success: true,
                    message: result.reason || 'Data delivered successfully via HubNet!',
                    transactionId: result.transaction_id,
                    reference: result.reference,
                    rawResponse: result
                };
            } else {
                return {
                    success: false,
                    error: result.reason || result.message || `HubNet Error: ${result.code}`,
                    code: result.code,
                    rawResponse: result
                };
            }

        } catch (error) {
            console.error('❌ HubNet API Error:', error);
            return {
                success: false,
                error: `Network error: ${error.message}`,
                rawResponse: null
            };
        }
    }

    // FIXED: REAL Balance Check using CORRECT documentation
    async checkBalance() {
        try {
            console.log('💰 Checking REAL HubNet balance...');
            
            const response = await fetch(this.balanceURL, {
                method: 'GET',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('💰 Balance Response Status:', response.status);

            if (!response.ok) {
                throw new Error(`Balance check failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('💰 HubNet Balance Response:', result);

            // Extract balance - documentation doesn't specify format, so we'll try common patterns
            let balance = null;

            if (result.balance !== undefined) {
                balance = parseFloat(result.balance);
            } else if (result.available_balance !== undefined) {
                balance = parseFloat(result.available_balance);
            } else if (result.data && result.data.balance !== undefined) {
                balance = parseFloat(result.data.balance);
            } else if (result.wallet_balance !== undefined) {
                balance = parseFloat(result.wallet_balance);
            }

            if (balance !== null && !isNaN(balance)) {
                return {
                    success: true,
                    available_balance: balance,
                    currency: 'GHS',
                    rawResponse: result
                };
            } else {
                console.warn('⚠️ Could not extract balance from response:', result);
                return {
                    success: false,
                    error: 'Could not extract balance from API response',
                    available_balance: 0,
                    rawResponse: result
                };
            }

        } catch (error) {
            console.error('❌ Balance check error:', error);
            return {
                success: false,
                error: error.message,
                available_balance: 0
            };
        }
    }

    // Test REAL connection
    async testConnection() {
        try {
            console.group('🔍 Testing REAL HubNet Connection');
            
            // Test balance check first
            const balanceResult = await this.checkBalance();
            
            if (balanceResult.success) {
                console.log('✅ Balance check successful');
                
                return {
                    connected: true,
                    message: `✅ HubNet API Connected! Balance: GH₵ ${balanceResult.available_balance.toFixed(2)}`,
                    balance: balanceResult,
                    details: {
                        balanceCheck: balanceResult
                    }
                };
            } else {
                return {
                    connected: false,
                    message: `❌ HubNet connection failed: ${balanceResult.error}`,
                    details: balanceResult
                };
            }
            
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return {
                connected: false,
                message: `❌ Connection test failed: ${error.message}`
            };
        } finally {
            console.groupEnd();
        }
    }

    // Get API status
    async getAPIStatus() {
        const balance = await this.checkBalance();
        return {
            apiKey: this.apiKey ? '✅ Configured' : '❌ Missing',
            balance: balance.success ? `GH₵ ${balance.available_balance.toFixed(2)}` : '❌ Unavailable',
            lastCheck: new Date().toLocaleTimeString(),
            details: balance
        };
    }
}

// Create global instance
const hubnetAPI = new HubNetAPI();