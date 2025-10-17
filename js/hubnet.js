// js/hubnet.js - FIXED BALANCE CHECK
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
            const cleanNumber = mtnNumber.toString().replace(/\s/g, '').replace('+233', '0');
            const volume = this.getVolumeFromBundle(bundleName);
            
            const payload = {
                "phone": cleanNumber,
                "volume": volume,
                "reference": reference,
                "referrer": cleanNumber
            };

            const response = await fetch(`${this.baseURL}/mtn-new-transaction`, {
                method: 'POST',
                headers: {
                    'token': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === true && result.code === "0000") {
                return {
                    success: true,
                    message: 'Data delivered successfully',
                    transactionId: result.transaction_id
                };
            } else {
                let errorMsg = 'Delivery failed. Please try again.';
                if (result.reason) errorMsg = result.reason;
                
                return {
                    success: false,
                    error: errorMsg
                };
            }

        } catch (error) {
            return {
                success: false,
                error: 'Network error. Please check your connection.'
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

            // Check if response is JSON first
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`API returned HTML instead of JSON. Status: ${response.status}`);
            }

            const result = await response.json();
            
            let balance = 0;
            if (result.data && result.data.wallet_balance !== undefined) {
                balance = result.data.wallet_balance;
            } else if (result.balance !== undefined) {
                balance = result.balance;
            } else if (result.available_balance !== undefined) {
                balance = result.available_balance;
            }

            return {
                success: true,
                available_balance: parseFloat(balance) || 0,
                currency: 'GHS'
            };

        } catch (error) {
            console.error('Balance check error:', error);
            return {
                success: false,
                error: error.message,
                available_balance: 0
            };
        }
    }

    async testConnection() {
        const balance = await this.checkBalance();
        if (balance.success) {
            return {
                connected: true,
                message: `✅ HubNet Connected | Balance: GHS ${balance.available_balance}`,
                balance: balance.available_balance
            };
        } else {
            return {
                connected: false,
                message: `❌ Connection failed: ${balance.error}`
            };
        }
    }
}

const hubnetAPI = new HubNetAPI();