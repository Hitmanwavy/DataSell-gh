// js/hubnet.js - FIXED HubNet API Integration
class HubNetAPI {
    constructor() {
        this.apiKey = "gOXXy0YSNd5CXZa4v568wuwbB70E8czAnM9";
        this.baseURL = 'https://console.hubnet.app/api'; // CORRECTED BASE URL
        this.balanceURL = 'https://console.hubnet.app/api/balance'; // CORRECTED ENDPOINT
    }

    getVolumeFromBundle(bundleName) {
        const volumeMap = {
            '100MB': '100',
            '300MB': '300',
            '500MB': '500',
            '1GB': '1024',
            '2GB': '2048', 
            '3GB': '3072',
            '5GB': '5120',
            '10GB': '10240'
        };
        return volumeMap[bundleName] || '1024';
    }

    // FIXED: REAL HubNet API call with correct format
    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            console.log('🚀 Sending REAL order to HubNet...');
            
            const volume = this.getVolumeFromBundle(bundleName);
            
            // CORRECTED PAYLOAD FORMAT
            const payload = {
                network: "MTN",
                mobile_number: mtnNumber,
                plan: volume, // Using volume as plan ID
                amount: this.getPriceFromBundle(bundleName), // Add amount field
                request_id: reference || 'DSG-' + Date.now()
            };

            console.log('📤 HubNet Payload:', payload);

            const response = await fetch(this.baseURL + '/data', { // CORRECTED ENDPOINT
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey // Added X-API-Key header
                },
                body: JSON.stringify(payload)
            });

            console.log('📥 HubNet Response Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HubNet HTTP Error:', errorText);
                throw new Error(`HubNet API Error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ HubNet API Response:', result);

            // FIXED: Handle different response formats
            if (result.status === "success" || result.success === true || result.code === "200") {
                return {
                    success: true,
                    message: result.message || 'Data delivered successfully via HubNet!',
                    transactionId: result.transaction_id || result.id || reference,
                    reference: result.reference || reference,
                    rawResponse: result
                };
            } else {
                return {
                    success: false,
                    error: result.message || result.reason || `HubNet Error: ${result.code}`,
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

    // Helper function to get price from bundle name
    getPriceFromBundle(bundleName) {
        const priceMap = {
            '100MB': 1.00,
            '300MB': 2.00,
            '500MB': 3.00,
            '1GB': 5.00,
            '2GB': 10.00,
            '3GB': 15.00,
            '5GB': 25.00,
            '10GB': 45.00
        };
        return priceMap[bundleName] || 5.00;
    }

    // FIXED: REAL Balance Check - SIMPLIFIED
    async checkBalance() {
        try {
            console.log('💰 Checking REAL HubNet balance...');
            
            const response = await fetch(this.balanceURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey
                }
            });

            console.log('💰 Balance Response Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Balance check failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('💰 HubNet Balance Response:', result);

            // SIMPLIFIED: Extract balance from common response formats
            let balance = null;

            // Try different possible balance field locations
            if (result.balance !== undefined) {
                balance = parseFloat(result.balance);
            } else if (result.available_balance !== undefined) {
                balance = parseFloat(result.available_balance);
            } else if (result.data && result.data.balance !== undefined) {
                balance = parseFloat(result.data.balance);
            } else if (result.data && result.data.available_balance !== undefined) {
                balance = parseFloat(result.data.available_balance);
            } else if (result.wallet_balance !== undefined) {
                balance = parseFloat(result.wallet_balance);
            } else if (result.data && result.data.wallet_balance !== undefined) {
                balance = parseFloat(result.data.wallet_balance);
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

    // FIXED: Test REAL connection with better error handling
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
                // If balance check fails, try a different endpoint or method
                console.log('🔄 Trying alternative connection test...');
                
                // Test with a simple API call to check if API key is valid
                const testResponse = await fetch(this.baseURL + '/test', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-API-Key': this.apiKey
                    }
                }).catch(e => null);

                if (testResponse && testResponse.ok) {
                    return {
                        connected: true,
                        message: '✅ HubNet API Connected (but balance check failed)',
                        balance: balanceResult,
                        details: { balanceCheck: balanceResult }
                    };
                }

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

    // NEW: Retry failed delivery with exponential backoff
    async retryDataDelivery(mtnNumber, bundleName, reference, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Retry attempt ${attempt} for ${reference}`);
            
            const result = await this.placeDataOrder(mtnNumber, bundleName, reference + '-RETRY-' + attempt);
            
            if (result.success) {
                return result;
            }
            
            // Wait before next retry (exponential backoff)
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return {
            success: false,
            error: `All ${maxRetries} delivery attempts failed`
        };
    }
}

// Create global instance
const hubnetAPI = new HubNetAPI();