// realtime-db.js - UPDATED FOR FIREBASE 12.4.0 MODULAR
import { database } from './firebase-config.js';
import { ref, push, set, get, update, onValue, off } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const realtimeDB = {
    // Save order to Firebase
    async saveOrder(orderData) {
        try {
            const ordersRef = ref(database, 'orders');
            const newOrderRef = push(ordersRef);
            await set(newOrderRef, {
                ...orderData,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toLocaleString()
            });
            console.log('✅ Order saved to Firebase:', orderData.id);
            return true;
        } catch (error) {
            console.error('❌ Error saving order:', error);
            return false;
        }
    },

    // Get all orders from Firebase
    async getOrders() {
        try {
            const ordersRef = ref(database, 'orders');
            const snapshot = await get(ordersRef);
            const orders = snapshot.val();
            
            if (!orders) {
                console.log('📭 No orders found in Firebase');
                return [];
            }
            
            // Convert object to array
            const ordersArray = Object.entries(orders).map(([key, value]) => ({
                id: key,
                ...value
            }));
            
            console.log('📥 Loaded orders from Firebase:', ordersArray.length);
            return ordersArray;
        } catch (error) {
            console.error('❌ Error getting orders:', error);
            // Fallback to localStorage
            const localOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
            console.log('🔄 Using local storage orders:', localOrders.length);
            return localOrders;
        }
    },

    // Update order status
    async updateOrder(orderId, updates) {
        try {
            const orderRef = ref(database, 'orders/' + orderId);
            await update(orderRef, updates);
            console.log('✏️ Order updated:', orderId, updates);
            return true;
        } catch (error) {
            console.error('❌ Error updating order:', error);
            return false;
        }
    },

    // Get bundle prices
    async getPrices() {
        try {
            const pricesRef = ref(database, 'prices');
            const snapshot = await get(pricesRef);
            const prices = snapshot.val();
            
            if (prices) {
                console.log('💰 Prices loaded from Firebase');
                return prices;
            } else {
                // Default prices if none exist
                const defaultPrices = {
                    '1GB': 5.70,
                    '2GB': 10.70, 
                    '3GB': 15.70,
                    '4GB': 20.70,
                    '5GB': 25.70,
                    '10GB': 50.70
                };
                console.log('⚙️ Using default prices');
                return defaultPrices;
            }
        } catch (error) {
            console.error('❌ Error getting prices:', error);
            // Fallback to localStorage
            const localPrices = JSON.parse(localStorage.getItem('bundlePrices')) || {
                '1GB': 5.70, '2GB': 10.70, '3GB': 15.70, 
                '4GB': 20.70, '5GB': 25.70, '10GB': 50.70
            };
            return localPrices;
        }
    },

    // Save bundle prices
    async savePrices(prices) {
        try {
            const pricesRef = ref(database, 'prices');
            await set(pricesRef, prices);
            // Also save to localStorage as backup
            localStorage.setItem('bundlePrices', JSON.stringify(prices));
            console.log('💾 Prices saved to Firebase and localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error saving prices:', error);
            // Fallback to localStorage only
            localStorage.setItem('bundlePrices', JSON.stringify(prices));
            return false;
        }
    },

    // Delete order (optional)
    async deleteOrder(orderId) {
        try {
            const orderRef = ref(database, 'orders/' + orderId);
            await set(orderRef, null);
            console.log('🗑️ Order deleted:', orderId);
            return true;
        } catch (error) {
            console.error('❌ Error deleting order:', error);
            return false;
        }
    },

    // Real-time listener for new orders
    listenForNewOrders(callback) {
        const ordersRef = ref(database, 'orders');
        onValue(ordersRef, (snapshot) => {
            const orders = snapshot.val();
            if (orders) {
                Object.entries(orders).forEach(([key, value]) => {
                    const newOrder = {
                        id: key,
                        ...value
                    };
                    console.log('🆕 New order received:', newOrder.id);
                    callback(newOrder);
                });
            }
        }, { onlyOnce: true });
    },

    // Real-time listener for order updates
    listenForOrderUpdates(callback) {
        const ordersRef = ref(database, 'orders');
        onValue(ordersRef, (snapshot) => {
            const orders = snapshot.val();
            if (orders) {
                Object.entries(orders).forEach(([key, value]) => {
                    const updatedOrder = {
                        id: key,
                        ...value
                    };
                    console.log('🔄 Order updated:', updatedOrder.id);
                    callback(updatedOrder);
                });
            }
        });
    },

    // Stop all listeners
    stopListening() {
        const ordersRef = ref(database, 'orders');
        off(ordersRef);
        console.log('🔇 Stopped Firebase listeners');
    }
};

// Make available globally
window.realtimeDB = realtimeDB;
console.log('🚀 Realtime DB functions loaded for Firebase 12.4.0');