// js/hubnet.js - REAL HubNet API Integration
class HubNetAPI {
    constructor() {
        this.apiKey = "gOXXy0YSNd5CXZa4v568wuwbB70E8czAnM9";
        this.baseURL = 'https://console.hubnet.app/live/api/context/business/transaction';
        this.balanceURL = 'https://console.hubnet.app/live/api/context/business/transaction/check_balance';
    }

    getVolumeFromBundle(bundleName) {
        const volumeMap = {
            '1GB': '1024',
            '2GB': '2048', 
            '3GB': '3072',
            '5GB': '5120',
            '10GB': '10240'
        };
        return volumeMap[bundleName] || '1024';
    }

    // REAL HubNet API call
    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            console.log('🚀 Sending REAL order to HubNet...');
            
            const volume = this.getVolumeFromBundle(bundleName);
            
            const payload = {
                phone: mtnNumber,
                volume: volume,
                reference: reference,
                referrer: mtnNumber
            };

            console.log('📤 HubNet Payload:', payload);

            const response = await fetch(this.baseURL + '/mtn-new-transaction', {
                method: 'POST',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}` // Added this header
                },
                body: JSON.stringify(payload)
            });

            console.log('📥 HubNet Response Status:', response.status);

            if (!response.ok) {
                throw new Error(`HubNet API Error: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ HubNet API Response:', result);

            // Handle HubNet response
            if (result.status === true && result.code === '0000') {
                return {
                    success: true,
                    message: 'Data delivered successfully via HubNet!',
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

    // REAL Balance Check - FIXED VERSION
    async checkBalance() {
        try {
            console.log('💰 Checking REAL HubNet balance...');
            
            const response = await fetch(this.balanceURL, {
                method: 'GET',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}` // Added this header
                }
            });

            console.log('💰 Balance Response Status:', response.status);

            if (!response.ok) {
                throw new Error(`Balance check failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('💰 HubNet Balance Response:', result);

            // FIXED: Extract balance from the correct location
            let balance = null;

            // Format from your API test: data.wallet_balance
            if (result.data && result.data.wallet_balance !== undefined) {
                balance = parseFloat(result.data.wallet_balance);
            }
            // Format 1: Direct balance field
            else if (result.balance !== undefined) {
                balance = parseFloat(result.balance);
            }
            // Format 2: available_balance field
            else if (result.available_balance !== undefined) {
                balance = parseFloat(result.available_balance);
            }
            // Format 3: Data object with balance
            else if (result.data && result.data.balance !== undefined) {
                balance = parseFloat(result.data.balance);
            }
            // Format 4: Try to find any numeric field with "balance" in name
            else {
                for (let key in result) {
                    if (key.toLowerCase().includes('balance') && typeof result[key] === 'number') {
                        balance = result[key];
                        break;
                    }
                }
                // Also check in data object
                if (balance === null && result.data) {
                    for (let key in result.data) {
                        if (key.toLowerCase().includes('balance') && typeof result.data[key] === 'number') {
                            balance = result.data[key];
                            break;
                        }
                    }
                }
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
                
                // Test a small order with test number (optional - comment out if you don't want to test purchases)
                /*
                const testResult = await this.placeDataOrder(
                    '0240000000', // Test number
                    '1GB',
                    'TEST-' + Date.now()
                );
                
                console.log('✅ Order test result:', testResult);
                */
                
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