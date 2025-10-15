// js/hubnet.js - SIMPLIFIED for Mobile
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

            const result = await response.json();

            if (result.status === true && result.code === "0000") {
                return {
                    success: true,
                    message: 'Data delivered successfully!',
                    transactionId: result.transaction_id
                };
            } else {
                return {
                    success: false,
                    error: result.reason || `Error: ${result.code}`
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

            const result = await response.json();
            
            // SIMPLE BALANCE EXTRACTION
            let balance = 0;
            
            // Try common balance fields
            if (result.balance) balance = result.balance;
            else if (result.available_balance) balance = result.available_balance;
            else if (result.data && result.data.balance) balance = result.data.balance;
            else if (result.amount) balance = result.amount;
            else balance = result; // Use entire response as balance

            return {
                success: true,
                available_balance: parseFloat(balance) || 0,
                rawResponse: result
            };

        } catch (error) {
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
                message: `✅ Connected! Balance: GHC ${balance.available_balance}`,
                balance: balance.available_balance
            };
        } else {
            return {
                connected: false,
                message: `❌ Failed: ${balance.error}`
            };
        }
    }
}

const hubnetAPI = new HubNetAPI();