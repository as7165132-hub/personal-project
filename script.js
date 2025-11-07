// Sample Products Data
const products = [
    {
        id: 1,
        name: '노트북',
        description: '고성능 프로그래밍 노트북',
        price: 1500000,
        emoji: '💻'
    },
    {
        id: 2,
        name: '스마트폰',
        description: '최신 스마트폰',
        price: 900000,
        emoji: '📱'
    },
    {
        id: 3,
        name: '태블릿',
        description: '휴대용 태블릿 PC',
        price: 600000,
        emoji: '📱'
    },
    {
        id: 4,
        name: '헤드폰',
        description: '노이즈 캔슬링 헤드폰',
        price: 300000,
        emoji: '🎧'
    },
    {
        id: 5,
        name: '키보드',
        description: '기계식 게이밍 키보드',
        price: 150000,
        emoji: '⌨️'
    },
    {
        id: 6,
        name: '마우스',
        description: '무선 게이밍 마우스',
        price: 80000,
        emoji: '🖱️'
    },
    {
        id: 7,
        name: '모니터',
        description: '27인치 4K 모니터',
        price: 500000,
        emoji: '🖥️'
    },
    {
        id: 8,
        name: '스피커',
        description: '블루투스 스피커',
        price: 120000,
        emoji: '🔊'
    }
];

// Cart State
let cart = [];

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartModal = document.getElementById('cartModal');
const closeBtn = document.getElementById('closeBtn');
const cartCount = document.getElementById('cartCount');
const cartItems = document.getElementById('cartItems');
const totalPrice = document.getElementById('totalPrice');
const clearCartBtn = document.getElementById('clearCartBtn');
const checkoutBtn = document.getElementById('checkoutBtn');

// Initialize App
function init() {
    renderProducts();
    loadCartFromStorage();
    updateCartUI();
    setupEventListeners();
}

// Render Products
function renderProducts() {
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">${product.emoji}</div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${formatPrice(product.price)}원</div>
                <button class="btn btn-primary" onclick="addToCart(${product.id})">
                    장바구니에 추가
                </button>
            </div>
        </div>
    `).join('');
}

// Add to Cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    updateCartUI();
    saveCartToStorage();
    showNotification('장바구니에 추가되었습니다!');
}

// Remove from Cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToStorage();
}

// Update Quantity
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
            saveCartToStorage();
        }
    }
}

// Update Cart UI
function updateCartUI() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Update cart items
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">장바구니가 비어있습니다.</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.emoji} ${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}원</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">삭제</button>
            </div>
        `).join('');
    }

    // Update total price
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPrice.textContent = formatPrice(total);
}

// Clear Cart
function clearCart() {
    if (cart.length === 0) {
        showNotification('장바구니가 이미 비어있습니다.');
        return;
    }

    if (confirm('장바구니를 비우시겠습니까?')) {
        cart = [];
        updateCartUI();
        saveCartToStorage();
        showNotification('장바구니가 비워졌습니다.');
    }
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        showNotification('장바구니가 비어있습니다.');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (confirm(`총 ${itemCount}개 상품, ${formatPrice(total)}원을 주문하시겠습니까?`)) {
        showNotification('주문이 완료되었습니다!');
        cart = [];
        updateCartUI();
        saveCartToStorage();
        closeModal();
    }
}

// Show/Hide Cart Modal
function showCart() {
    cartModal.classList.add('active');
}

function closeModal() {
    cartModal.classList.remove('active');
}

// Event Listeners
function setupEventListeners() {
    cartBtn.addEventListener('click', showCart);
    closeBtn.addEventListener('click', closeModal);
    clearCartBtn.addEventListener('click', clearCart);
    checkoutBtn.addEventListener('click', checkout);

    // Close modal when clicking outside
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cartModal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Local Storage Functions
function saveCartToStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('shoppingCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Utility Functions
function formatPrice(price) {
    return price.toLocaleString('ko-KR');
}

function showNotification(message) {
    // Simple notification - could be enhanced with a toast library
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background-color: #2ecc71;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
