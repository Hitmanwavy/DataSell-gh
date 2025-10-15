// js/hubnet.js - PROFESSIONAL FIX
class HubNetAPI {
    constructor() {
        this.apiKey = "gOXXy0YSNd5CXZa4v568wuwbB70E8czAnM9";
        this.baseURL = 'https://console.hubnet.app/live/api/context/business/transaction';
        this.balanceURL = 'https://console.hubnet.app/live/api/context/business/transaction/check_balance';
    }

    getVolumeFromBundle(bundleName) {
        const volumeMap = {
            '100MB': '100', '300MB': '300', '500MB': '500',
            '1GB': '1024', '2GB': '2048', '3GB': '3072',
            '4GB': '4096', '5GB': '5120', '10GB': '10240'
        };
        return volumeMap[bundleName] || '1024';
    }

    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            const volume = this.getVolumeFromBundle(bundleName);
            const payload = {
                "phone": mtnNumber,
                "volume": volume,
                "reference": reference,
                "referrer": mtnNumber
            };

            const response = await fetch(`${this.baseURL}/mtn-new-transaction`, {
                method: 'POST',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === true && result.code === "0000") {
                return {
                    success: true,
                    message: 'Data delivered successfully via HubNet',
                    transactionId: result.transaction_id,
                    reference: result.reference
                };
            } else {
                return {
                    success: false,
                    error: result.reason || `HubNet Error: ${result.code}`
                };
            }

        } catch (error) {
            return {
                success: false,
                error: `Network error: ${error.message}`
            };
        }
    }

    async checkBalance() {
        try {
            const response = await fetch(this.balanceURL, {
                method: 'GET',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Balance API Error: ${response.status}`);
            }

            const result = await response.json();
            
            // PROFESSIONAL BALANCE EXTRACTION
            // The API is returning your balance but in a field we haven't identified
            // Let's systematically find the correct field
            let balance = this.extractBalanceFromResponse(result);
            
            if (balance === null) {
                // If we can't find the balance field, we need to see the actual response
                console.error('Balance extraction failed. API Response:', result);
                throw new Error('Cannot parse balance from API response');
            }

            return {
                success: true,
                available_balance: balance,
                currency: 'GHS',
                rawResponse: result
            };

        } catch (error) {
            console.error('HubNet Balance Error:', error);
            return {
                success: false,
                error: error.message,
                available_balance: 0
            };
        }
    }

    extractBalanceFromResponse(result) {
        // Try all possible balance field names systematically
        const balanceFields = [
            'balance', 'available_balance', 'current_balance', 'wallet_balance',
            'amount', 'account_balance', 'total_balance', 'remaining_balance',
            'balance_amount', 'wallet_amount'
        ];

        // Check root level
        for (let field of balanceFields) {
            if (result[field] !== undefined && result[field] !== null) {
                const value = parseFloat(result[field]);
                if (!isNaN(value)) {
                    console.log(`Found balance at root.${field}: ${value}`);
                    return value;
                }
            }
        }

        // Check nested data object
        if (result.data) {
            for (let field of balanceFields) {
                if (result.data[field] !== undefined && result.data[field] !== null) {
                    const value = parseFloat(result.data[field]);
                    if (!isNaN(value)) {
                        console.log(`Found balance at data.${field}: ${value}`);
                        return value;
                    }
                }
            }
            
            // Check if data itself is the balance
            if (typeof result.data === 'number') {
                console.log(`Found balance as data: ${result.data}`);
                return result.data;
            }
        }

        // Check response object
        if (result.response) {
            for (let field of balanceFields) {
                if (result.response[field] !== undefined && result.response[field] !== null) {
                    const value = parseFloat(result.response[field]);
                    if (!isNaN(value)) {
                        console.log(`Found balance at response.${field}: ${value}`);
                        return value;
                    }
                }
            }
        }

        // Last resort: find any numeric field that could be a balance
        const numericFields = this.findNumericFields(result);
        if (numericFields.length > 0) {
            console.log('Potential balance fields found:', numericFields);
            // Return the largest numeric value (most likely to be balance)
            return Math.max(...numericFields.map(f => f.value));
        }

        return null;
    }

    findNumericFields(obj, path = 'root', found = []) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const currentPath = `${path}.${key}`;
                
                if (typeof value === 'number' && value > 0) {
                    found.push({ path: currentPath, value: value });
                } else if (typeof value === 'object' && value !== null) {
                    this.findNumericFields(value, currentPath, found);
                }
            }
        }
        return found;
    }

    async testConnection() {
        try {
            const balanceResult = await this.checkBalance();
            
            if (balanceResult.success) {
                return {
                    connected: true,
                    message: `✅ HubNet API Connected | Balance: GHC ${balanceResult.available_balance.toFixed(3)}`,
                    balance: balanceResult.available_balance
                };
            } else {
                return {
                    connected: false,
                    message: `❌ HubNet Connection Failed: ${balanceResult.error}`
                };
            }
        } catch (error) {
            return {
                connected: false,
                message: `❌ Connection Test Error: ${error.message}`
            };
        }
    }
}

const hubnetAPI = new HubNetAPI();