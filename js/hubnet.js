// js/hubnet.js - FIXED with correct API documentation
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

    // FIXED: Correct endpoint format from documentation
    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            console.log('🚀 Sending order to HubNet...');
            
            const volume = this.getVolumeFromBundle(bundleName);
            
            // CORRECT payload format from documentation
            const payload = {
                "phone": mtnNumber,
                "volume": volume,
                "reference": reference,
                "referrer": mtnNumber
                // webhook is optional - removed for simplicity
            };

            console.log('📤 HubNet Payload:', payload);

            // CORRECT endpoint format: {network}-new-transaction
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

            // Check if response is JSON first
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const errorText = await response.text();
                throw new Error(`Server returned non-JSON: ${errorText.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ HubNet API Response:', result);

            // CORRECT response parsing from documentation
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

    // FIXED: Balance check with proper GET request
    async checkBalance() {
        try {
            console.log('💰 Checking HubNet balance...');
            
            const response = await fetch(this.balanceURL, {
                method: 'GET',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('💰 Balance Response Status:', response.status);

            // Check if response is JSON first
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const errorText = await response.text();
                console.error('💰 Non-JSON Response:', errorText.substring(0, 200));
                
                if (response.status === 404) {
                    throw new Error('Balance endpoint not found (404). Check if API key has balance permission.');
                } else if (response.status === 401) {
                    throw new Error('Authentication failed (401). Check API key.');
                } else {
                    throw new Error(`Server returned HTML/Error: ${response.status}`);
                }
            }

            if (!response.ok) {
                throw new Error(`Balance check failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('💰 HubNet Balance Response:', result);

            // Extract balance from response
            // Note: Documentation doesn't specify balance response format
            // Try common field names
            let balance = null;

            if (result.balance !== undefined) {
                balance = parseFloat(result.balance);
            } 
            else if (result.available_balance !== undefined) {
                balance = parseFloat(result.available_balance);
            }
            else if (result.data && result.data.balance !== undefined) {
                balance = parseFloat(result.data.balance);
            }
            else if (result.amount !== undefined) {
                balance = parseFloat(result.amount);
            }

            if (balance !== null && !isNaN(balance)) {
                return {
                    success: true,
                    available_balance: balance,
                    currency: 'GHS',
                    rawResponse: result
                };
            } else {
                // If we can't find balance, but API call succeeded, show the raw response
                return {
                    success: true,
                    available_balance: 0,
                    message: 'Balance field not found in response',
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

    // FIXED: Better connection test
    async testConnection() {
        try {
            console.group('🔍 Testing HubNet Connection');
            
            // Test balance endpoint first
            const balanceTest = await this.checkBalance();
            
            if (balanceTest.success) {
                return {
                    connected: true,
                    message: '✅ HubNet API Connected Successfully!',
                    balance: balanceTest.available_balance,
                    rawResponse: balanceTest.rawResponse
                };
            } else {
                // If balance fails, test purchase endpoint
                console.log('⚠️ Balance check failed, testing purchase endpoint...');
                
                const testEndpoint = `${this.baseURL}/mtn-new-transaction`;
                const response = await fetch(testEndpoint, {
                    method: 'POST',
                    headers: {
                        'token': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "phone": "0240000000",
                        "volume": "100",
                        "reference": "CONNECTION-TEST-123",
                        "referrer": "0240000000"
                    })
                });

                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    const result = await response.json();
                    return {
                        connected: true,
                        message: '✅ Purchase endpoint is working!',
                        rawResponse: result
                    };
                } else {
                    return {
                        connected: false,
                        message: `❌ Both endpoints failed. Balance: ${balanceTest.error}`,
                        status: response.status
                    };
                }
            }
            
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return {
                connected: false,
                message: `❌ Connection failed: ${error.message}`
            };
        } finally {
            console.groupEnd();
        }
    }

    // Quick connectivity test
    async quickTest() {
        try {
            const response = await fetch(this.balanceURL, {
                method: 'GET',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const contentType = response.headers.get('content-type');
            return {
                connected: response.ok && contentType && contentType.includes('application/json'),
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