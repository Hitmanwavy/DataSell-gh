// js/hubnet.js - MOBILE FRIENDLY WITH ON-SCREEN ERRORS
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

    // Show mobile-friendly error
    showMobileError(message) {
        // Create error popup
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            font-weight: bold;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        errorDiv.textContent = `❌ ${message}`;
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }

    async placeDataOrder(mtnNumber, bundleName, reference) {
        try {
            // Show processing status on mobile
            this.showMobileError('🔄 Processing your order...');
            
            const cleanNumber = mtnNumber.toString().replace(/\s/g, '').replace('+233', '0');
            if (cleanNumber.length !== 10 || !cleanNumber.startsWith('0')) {
                this.showMobileError('Invalid MTN number. Use: 0241234567');
                throw new Error('Invalid MTN number format');
            }

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

            const responseText = await response.text();

            if (!response.ok) {
                this.showMobileError(`Server Error ${response.status}. Try again.`);
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                this.showMobileError('Invalid server response');
                throw new Error(`Invalid JSON: ${responseText}`);
            }

            // Check specific HubNet error codes
            if (result.status === true && result.code === "0000") {
                this.showMobileError('✅ Data delivered successfully!');
                return {
                    success: true,
                    message: 'Data delivered successfully',
                    transactionId: result.transaction_id,
                    reference: result.reference
                };
            } else {
                // Show user-friendly error messages
                let errorMsg = 'Delivery failed. Please try again.';
                
                if (result.code === "1003") {
                    errorMsg = 'Insufficient balance in your HubNet account';
                } else if (result.code === "1004") {
                    errorMsg = 'Invalid MTN number format';
                } else if (result.reason) {
                    errorMsg = result.reason;
                }
                
                this.showMobileError(`❌ ${errorMsg}`);
                return {
                    success: false,
                    error: errorMsg,
                    code: result.code
                };
            }

        } catch (error) {
            this.showMobileError('Network error. Check internet connection.');
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

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Balance API error: ${response.status}`);
            }

            const result = JSON.parse(responseText);
            
            let balance = 0;
            if (result.data && result.data.wallet_balance !== undefined) {
                balance = result.data.wallet_balance;
            } else if (result.balance !== undefined) {
                balance = result.balance;
            }

            return {
                success: true,
                available_balance: parseFloat(balance) || 0,
                currency: 'GHS'
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
        try {
            const balance = await this.checkBalance();
            if (balance.success) {
                this.showMobileError(`✅ Connected! Balance: GHS ${balance.available_balance}`);
                return {
                    connected: true,
                    message: `HubNet Connected | Balance: GHS ${balance.available_balance}`,
                    balance: balance.available_balance
                };
            } else {
                this.showMobileError('❌ Connection failed');
                return {
                    connected: false,
                    message: `Connection failed: ${balance.error}`
                };
            }
        } catch (error) {
            this.showMobileError('❌ Connection test failed');
            return {
                connected: false,
                message: error.message
            };
        }
    }
}

const hubnetAPI = new HubNetAPI();