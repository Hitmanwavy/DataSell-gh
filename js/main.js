// DataSell Ghana - Production JavaScript
// MTN Data Reselling Business

// =============================================
// CONFIGURATION - UPDATE THESE FOR YOUR BUSINESS
// =============================================

const BUSINESS_CONFIG = {
    businessName: "DataSell Ghana",
    businessPhone: "+233266676258", // Add your phone number
    businessEmail: "wavesdc118@gmail.com", // Add your email
    supportHours: "24/7",
    currency: "GH₵"
};

// =============================================
// ORDER MANAGEMENT SYSTEM WITH REALTIME DATABASE
// =============================================

function buyPlan(planSize, price) {
    if (!checkUserAuth()) {
        // Save the intended purchase and redirect to login
        localStorage.setItem('pendingOrder', JSON.stringify({
            plan: planSize,
            price: price,
            timestamp: new Date().getTime()
        }));
        window.location.href = 'login.html';
        return;
    }
    
    // Show payment confirmation
    showPaymentConfirmation(planSize, price);
}

function showPaymentConfirmation(planSize, price) {
    const userEmail = localStorage.getItem('userEmail');
    const userPhone = localStorage.getItem('userPhone') || 'Not provided';
    
    const confirmation = confirm(
        `🛒 ORDER CONFIRMATION\n\n` +
        `Plan: ${planSize} MTN Data\n` +
        `Price: ${BUSINESS_CONFIG.currency} ${price}\n` +
        `Customer: ${userEmail}\n\n` +
        `📞 Contact ${BUSINESS_CONFIG.businessPhone} to complete payment via Mobile Money\n\n` +
        `Click OK to create order and contact us for payment.`
    );
    
    if (confirmation) {
        createOrder(planSize, price);
    }
}

// UPDATED: Now uses Realtime Database
async function createOrder(planSize, price) {
    try {
        const userEmail = localStorage.getItem('userEmail');
        const userPhone = localStorage.getItem('userPhone') || 'Not provided';
        
        // Create comprehensive order object
        const newOrder = {
            customer: userEmail,
            customerPhone: userPhone,
            plan: planSize + ' MTN Non-Expiry Data',
            price: price,
            date: new Date().toLocaleDateString('en-GB', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            }),
            time: new Date().toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            timestamp: new Date().getTime(),
            status: 'pending_payment',
            paymentMethod: 'mobile_money',
            network: 'MTN'
        };
        
        // UPDATED: Save to Realtime Database instead of localStorage
        const savedOrder = await realtimeDB.createOrder(newOrder);
        
        // Show success message with next steps
        alert(
            `✅ ORDER #${savedOrder.id} CREATED SUCCESSFULLY!\n\n` +
            `📦 ${planSize} MTN Non-Expiry Data\n` +
            `💰 Amount: ${BUSINESS_CONFIG.currency} ${price}\n\n` +
            `📞 NEXT STEPS:\n` +
            `1. Contact ${BUSINESS_CONFIG.businessPhone}\n` +
            `2. Send Mobile Money payment\n` +
            `3. We'll deliver instantly!\n\n` +
            `Order saved to database.`
        );
        
        // Redirect to dashboard
        redirectToDashboard();
        
    } catch (error) {
        console.error('Order creation error:', error);
        alert('❌ Order failed. Please try again or contact support.');
    }
}

// UPDATED: This function is now handled by realtimeDB.createOrder()
// Removed saveOrderToAdmin function

// =============================================
// USER AUTHENTICATION & MANAGEMENT
// =============================================

function checkUserAuth() {
    return localStorage.getItem('userLoggedIn') === 'true';
}

function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

function logout() {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userJoinDate');
    window.location.href = 'index.html';
}

// =============================================
// PAYMENT & BUSINESS LOGIC
// =============================================

// UPDATED: Now uses Realtime Database
async function completePayment(orderId) {
    try {
        await realtimeDB.updateOrder(orderId, {
            status: 'paid',
            paymentDate: new Date().toLocaleDateString()
        });
        
        // Notify user
        alert(`✅ Payment confirmed for Order #${orderId}\n\nData will be delivered shortly!`);
        
        // Refresh displays
        if (typeof updateStats === 'function') updateStats();
        if (typeof displayOrders === 'function') displayOrders();
    } catch (error) {
        console.error('Error completing payment:', error);
        alert('❌ Failed to update payment status.');
    }
}

// UPDATED: Now uses Realtime Database
async function deliverData(orderId) {
    try {
        await realtimeDB.updateOrder(orderId, {
            status: 'delivered',
            deliveryDate: new Date().toLocaleDateString()
        });
        
        // Refresh displays
        if (typeof updateStats === 'function') updateStats();
        if (typeof displayOrders === 'function') displayOrders();
        if (typeof updateUserStats === 'function') updateUserStats();
        if (typeof displayUserOrders === 'function') displayUserOrders();
    } catch (error) {
        console.error('Error delivering data:', error);
        alert('❌ Failed to update delivery status.');
    }
}

// =============================================
// NAVIGATION & UI MANAGEMENT
// =============================================

function updateNavigation() {
    const isLoggedIn = checkUserAuth();
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const dashboardLink = document.getElementById('dashboardLink');
    const logoutLink = document.getElementById('logoutLink');
    
    if (isLoggedIn) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'block';
    }
}

function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.style.color = '#FFD700';
            link.style.fontWeight = 'bold';
        }
    });
}

// =============================================
// FORM HANDLERS & VALIDATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // Registration Form
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';
            
            if (!isValidEmail(email)) {
                alert('❌ Please enter a valid email address');
                return;
            }
            
            // Store user data
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            if (phone) localStorage.setItem('userPhone', phone);
            localStorage.setItem('userJoinDate', new Date().toLocaleDateString());
            
            // Handle pending orders
            const pendingOrder = localStorage.getItem('pendingOrder');
            if (pendingOrder) {
                const order = JSON.parse(pendingOrder);
                createOrder(order.plan, order.price);
                localStorage.removeItem('pendingOrder');
            } else {
                alert('✅ Account created successfully! Welcome to DataSell Ghana.');
                redirectToDashboard();
            }
        });
    }
    
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password') ? document.getElementById('password').value : '';
            
            // Simple authentication (in production, this would be server-side)
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            
            const pendingOrder = localStorage.getItem('pendingOrder');
            if (pendingOrder) {
                const order = JSON.parse(pendingOrder);
                createOrder(order.plan, order.price);
                localStorage.removeItem('pendingOrder');
            } else {
                alert('✅ Login successful! Welcome back.');
                redirectToDashboard();
            }
        });
    }
    
    // Initialize navigation
    updateNavigation();
    highlightCurrentPage();
    
    // Handle pending orders
    const pendingOrder = localStorage.getItem('pendingOrder');
    const isLoggedIn = checkUserAuth();
    
    if (pendingOrder && isLoggedIn) {
        const order = JSON.parse(pendingOrder);
        // Check if order is less than 1 hour old
        if (Date.now() - order.timestamp < 3600000) {
            createOrder(order.plan, order.price);
        }
        localStorage.removeItem('pendingOrder');
    }
});

// =============================================
// UTILITY FUNCTIONS
// =============================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatPrice(price) {
    return `${BUSINESS_CONFIG.currency} ${parseFloat(price).toFixed(2)}`;
}

function getBusinessInfo() {
    return `
📞 Contact: ${BUSINESS_CONFIG.businessPhone}
📧 Email: ${BUSINESS_CONFIG.businessEmail}
⏰ Support: ${BUSINESS_CONFIG.supportHours}
    `;
}

// =============================================
// DASHBOARD FUNCTIONS - UPDATED FOR REALTIME DB
// =============================================

// UPDATED: Now uses Realtime Database
async function getUserOrders() {
    try {
        const userEmail = localStorage.getItem('userEmail');
        return await realtimeDB.getCustomerOrders(userEmail);
    } catch (error) {
        console.error('Error getting user orders:', error);
        // Fallback to localStorage
        const allOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
        return allOrders.filter(order => order.customer === localStorage.getItem('userEmail'));
    }
}

// UPDATED: Now async
async function updateUserStats() {
    try {
        const userOrders = await getUserOrders();
        const totalOrders = userOrders.length;
        const pendingOrders = userOrders.filter(order => 
            order.status === 'pending_payment' || order.status === 'paid'
        ).length;
        const deliveredOrders = userOrders.filter(order => 
            order.status === 'delivered'
        ).length;
        const totalSpent = userOrders.reduce((sum, order) => sum + order.price, 0);
        
        // Update DOM elements if they exist
        const elements = {
            'totalOrders': totalOrders,
            'pendingOrders': pendingOrders,
            'deliveredOrders': deliveredOrders,
            'totalSpent': totalSpent.toFixed(2)
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = elements[id];
        });
    } catch (error) {
        console.error('Error updating user stats:', error);
    }
}

// UPDATED: Now async
async function displayUserOrders() {
    try {
        const userOrders = await getUserOrders();
        const ordersTable = document.getElementById('userOrdersTable');
        
        if (!ordersTable) return;
        
        if (userOrders.length === 0) {
            ordersTable.innerHTML = `
                <div class="no-orders">
                    <p>📦 No orders yet</p>
                    <p><a href="mtn-plans.html" style="color: #FFD700;">Browse MTN plans</a> to get started!</p>
                </div>
            `;
            return;
        }
        
        let tableHTML = `
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        userOrders.forEach(order => {
            const statusText = getStatusText(order.status);
            const actionButton = getActionButton(order);
            
            tableHTML += `
                <tr>
                    <td><strong>${order.id}</strong></td>
                    <td>${order.plan}</td>
                    <td>${formatPrice(order.price)}</td>
                    <td>${order.date}</td>
                    <td><span class="order-status status-${order.status}">${statusText}</span></td>
                    <td>${actionButton}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        ordersTable.innerHTML = tableHTML;
    } catch (error) {
        console.error('Error displaying user orders:', error);
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending_payment': 'AWAITING PAYMENT',
        'paid': 'PAID - PROCESSING',
        'delivered': 'DELIVERED ✅'
    };
    return statusMap[status] || status.toUpperCase();
}

function getActionButton(order) {
    if (order.status === 'pending_payment') {
        return `<button class="action-btn pay-btn" onclick="contactForPayment('${order.id}')">Pay Now</button>`;
    } else if (order.status === 'paid') {
        return `<span class="processing">Awaiting Delivery</span>`;
    } else {
        return `<span class="delivered">Completed</span>`;
    }
}

function contactForPayment(orderId) {
    alert(
        `📞 CONTACT FOR PAYMENT\n\n` +
        `Order: #${orderId}\n\n` +
        `Please contact us at:\n` +
        `Phone: ${BUSINESS_CONFIG.businessPhone}\n` +
        `Email: ${BUSINESS_CONFIG.businessEmail}\n\n` +
        `We accept Mobile Money payments.`
    );
}

// =============================================
// AUTO-INITIALIZATION - UPDATED FOR ASYNC
// =============================================

// Initialize dashboard if on dashboard page
if (window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        if (!checkUserAuth()) {
            window.location.href = 'login.html';
            return;
        }
        
        await updateUserStats();
        await displayUserOrders();
        updateNavigation();
        highlightCurrentPage();
    });
}

// Initialize admin dashboard if on admin page
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        updateNavigation();
    });
}