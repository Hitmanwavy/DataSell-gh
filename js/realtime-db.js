// js/realtime-db.js - Firebase Realtime Database Service
class RealtimeDatabase {
    constructor() {
        this.firebaseConfig = {
            apiKey: "AIzaSyB-uzPiEdPFF3Kpcc_z84Xf5K_K_aBTAow",
            authDomain: "datasell-ghana.firebaseapp.com",
            databaseURL: "https://datasell-ghana-default-rtdb.firebaseio.com",
            projectId: "datasell-ghana",
            storageBucket: "datasell-ghana.firebasestorage.app",
            messagingSenderId: "445930494627",
            appId: "1:445930494627:web:bbc6d57dec368cdf1e3d16"
        };

        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(this.firebaseConfig);
        }
        
        this.db = firebase.database();
    }

    // ========== ORDER MANAGEMENT ==========
    async createOrder(orderData) {
        try {
            const orderId = 'DSG' + Date.now();
            const orderWithId = {
                ...orderData,
                id: orderId,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            // Save to Realtime Database
            await this.db.ref('orders/' + orderId).set(orderWithId);
            console.log('✅ Order saved to Realtime DB:', orderId);
            
            // Also save to localStorage for immediate UI updates
            this.saveToLocalStorage('adminOrders', orderWithId);
            
            return orderWithId;
        } catch (error) {
            console.error('❌ Error saving order to database:', error);
            // Fallback to localStorage
            return this.createOrderLocalStorage(orderData);
        }
    }

    async updateOrder(orderId, updates) {
        try {
            updates.updatedAt = Date.now();
            await this.db.ref('orders/' + orderId).update(updates);
            console.log('✅ Order updated in Realtime DB:', orderId);
            
            // Also update localStorage
            this.updateLocalStorageOrder(orderId, updates);
        } catch (error) {
            console.error('❌ Error updating order:', error);
            this.updateLocalStorageOrder(orderId, updates);
        }
    }

    async getOrders(limit = 100) {
        try {
            const snapshot = await this.db.ref('orders')
                .orderByChild('createdAt')
                .limitToLast(limit)
                .once('value');
            
            const orders = [];
            snapshot.forEach(childSnapshot => {
                orders.push(childSnapshot.val());
            });
            
            // Return newest first
            return orders.reverse();
        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            // Fallback to localStorage
            return this.getOrdersFromLocalStorage();
        }
    }

    async getCustomerOrders(customerEmail) {
        try {
            const snapshot = await this.db.ref('orders')
                .orderByChild('customer')
                .equalTo(customerEmail)
                .once('value');
            
            const orders = [];
            snapshot.forEach(childSnapshot => {
                orders.push(childSnapshot.val());
            });
            
            return orders.reverse(); // Newest first
        } catch (error) {
            console.error('❌ Error fetching customer orders:', error);
            return this.getCustomerOrdersLocalStorage(customerEmail);
        }
    }

    // ========== PRICE MANAGEMENT ==========
    async savePrices(prices) {
        try {
            await this.db.ref('settings/bundlePrices').set({
                ...prices,
                updatedAt: Date.now(),
                updatedBy: 'admin'
            });
            console.log('✅ Prices saved to Realtime DB');
            
            // Also update localStorage
            localStorage.setItem('bundlePrices', JSON.stringify(prices));
        } catch (error) {
            console.error('❌ Error saving prices:', error);
            localStorage.setItem('bundlePrices', JSON.stringify(prices));
        }
    }

    async getPrices() {
        try {
            const snapshot = await this.db.ref('settings/bundlePrices').once('value');
            const prices = snapshot.val();
            
            if (prices) {
                // Save to localStorage for faster access
                localStorage.setItem('bundlePrices', JSON.stringify(prices));
                return prices;
            } else {
                // Return default prices if none in database
                return this.getDefaultPrices();
            }
        } catch (error) {
            console.error('❌ Error fetching prices:', error);
            return this.getPricesFromLocalStorage();
        }
    }

    // ========== LOCALSTORAGE FALLBACK ==========
    createOrderLocalStorage(orderData) {
        const orderId = 'DSG' + Date.now();
        const orderWithId = {
            ...orderData,
            id: orderId,
            createdAt: Date.now()
        };
        this.saveToLocalStorage('adminOrders', orderWithId);
        return orderWithId;
    }

    saveToLocalStorage(key, data) {
        try {
            let existingData = JSON.parse(localStorage.getItem(key)) || [];
            existingData.unshift(data);
            localStorage.setItem(key, JSON.stringify(existingData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    updateLocalStorageOrder(orderId, updates) {
        try {
            let orders = JSON.parse(localStorage.getItem('adminOrders')) || [];
            const orderIndex = orders.findIndex(order => order.id === orderId);
            
            if (orderIndex !== -1) {
                orders[orderIndex] = { ...orders[orderIndex], ...updates };
                localStorage.setItem('adminOrders', JSON.stringify(orders));
            }
        } catch (error) {
            console.error('Error updating localStorage order:', error);
        }
    }

    getOrdersFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem('adminOrders')) || [];
        } catch (error) {
            console.error('Error getting orders from localStorage:', error);
            return [];
        }
    }

    getCustomerOrdersLocalStorage(customerEmail) {
        try {
            const allOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
            return allOrders.filter(order => order.customer === customerEmail);
        } catch (error) {
            console.error('Error getting customer orders from localStorage:', error);
            return [];
        }
    }

    getPricesFromLocalStorage() {
        try {
            const prices = JSON.parse(localStorage.getItem('bundlePrices'));
            return prices || this.getDefaultPrices();
        } catch (error) {
            console.error('Error getting prices from localStorage:', error);
            return this.getDefaultPrices();
        }
    }

    getDefaultPrices() {
        return {
            '1GB': 5.70,
            '2GB': 10.70,
            '3GB': 15.70,
            '4GB': 20.70,
            '5GB': 25.70,
            '10GB': 50.70
        };
    }

    // ========== REAL-TIME LISTENERS ==========
    listenForNewOrders(callback) {
        return this.db.ref('orders')
            .orderByChild('createdAt')
            .limitToLast(1)
            .on('child_added', (snapshot) => {
                callback(snapshot.val());
            });
    }

    listenForOrderUpdates(orderId, callback) {
        return this.db.ref('orders/' + orderId).on('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    // Cleanup listeners
    removeListeners() {
        this.db.ref('orders').off();
    }
}

// Create global instance
const realtimeDB = new RealtimeDatabase();