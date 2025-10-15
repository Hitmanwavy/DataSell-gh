// js/hubnet.js - FIXED Balance Check
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

    // REAL HubNet API call - WORKING
    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            console.log('🚀 Sending REAL order to HubNet...');
            
            const volume = this.getVolumeFromBundle(bundleName);
            
            const payload = {
                "phone": mtnNumber,
                "volume": volume,
                "reference": reference,
                "referrer": mtnNumber
            };

            console.log('📤 HubNet Payload:', payload);

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

    // FIXED: Balance Check - Added POST method and proper payload
    async checkBalance() {
        try {
            console.log('💰 Checking REAL HubNet balance...');
            
            // HubNet balance endpoint might require POST method
            const response = await fetch(this.balanceURL, {
                method: 'POST', // Changed from GET to POST
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Some APIs require empty payload
            });

            console.log('💰 Balance Response Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('💰 Balance Error Response:', errorText);
                
                // Try with GET method if POST fails
                const getResponse = await fetch(this.balanceURL, {
                    method: 'GET',
                    headers: {
                        'token': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!getResponse.ok) {
                    throw new Error(`Balance check failed: POST=${response.status}, GET=${getResponse.status}`);
                }
                
                const getResult = await getResponse.json();
                return this.extractBalance(getResult);
            }

            const result = await response.json();
            return this.extractBalance(result);

        } catch (error) {
            console.error('❌ Balance check error:', error);
            return {
                success: false,
                error: error.message,
                available_balance: 0
            };
        }
    }

    // Helper method to extract balance from different response formats
    extractBalance(result) {
        console.log('💰 HubNet Balance FULL Response:', result);

        let balance = null;

        // Log all keys to see what's available
        console.log('💰 Balance Response Keys:', Object.keys(result));
        if (result.data) {
            console.log('💰 Balance Data Keys:', Object.keys(result.data));
        }

        // Try common balance field locations
        if (result.balance !== undefined) {
            balance = parseFloat(result.balance);
        } 
        else if (result.available_balance !== undefined) {
            balance = parseFloat(result.available_balance);
        }
        else if (result.wallet_balance !== undefined) {
            balance = parseFloat(result.wallet_balance);
        }
        else if (result.data && result.data.balance !== undefined) {
            balance = parseFloat(result.data.balance);
        }
        else if (result.data && result.data.available_balance !== undefined) {
            balance = parseFloat(result.data.available_balance);
        }
        else if (result.data && result.data.wallet_balance !== undefined) {
            balance = parseFloat(result.data.wallet_balance);
        }
        else if (result.amount !== undefined) {
            balance = parseFloat(result.amount);
        }
        else if (result.data && result.data.amount !== undefined) {
            balance = parseFloat(result.data.amount);
        }

        // If still no balance found, try to find any numeric field
        if (balance === null) {
            for (let key in result) {
                if (typeof result[key] === 'number' && result[key] > 0) {
                    balance = result[key];
                    console.log(`💰 Found balance in field: ${key} = ${balance}`);
                    break;
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
            console.warn('⚠️ Could not extract balance from response. Full response:', result);
            return {
                success: false,
                error: 'Balance field not found in API response',
                available_balance: 0,
                rawResponse: result
            };
        }
    }

    // SIMPLIFIED Connection Test
    async testConnection() {
        try {
            console.group('🔍 Testing HubNet Connection');
            
            // Test both purchase and balance endpoints
            const balanceResult = await this.checkBalance();
            
            if (balanceResult.success || balanceResult.rawResponse) {
                console.log('✅ HubNet API is responding');
                return {
                    connected: true,
                    message: '✅ HubNet API Connected!',
                    balance: balanceResult,
                    rawResponse: balanceResult.rawResponse
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

    // Quick connectivity test
    async quickTest() {
        try {
            const response = await fetch(this.balanceURL, {
                method: 'POST',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            return {
                connected: response.ok,
                status: response.status,
                message: response.ok ? '✅ API Connected' : `❌ API Error: ${response.status}`
            };
        } catch (error) {
            return {
                connected: false,
                message: `❌ Connection failed: ${error.message}`
            };
        }
    }
}

// Create global instance
const hubnetAPI = new HubNetAPI();