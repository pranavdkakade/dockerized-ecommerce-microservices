import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  User,
  Cpu,
  Database,
  Plus,
  Minus,
  Trash2,
  Lock,
  Mail,
  Terminal,
  Activity,
  LogOut,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  LayoutDashboard,
  Layers,
  Archive
} from 'lucide-react';

// TypeScript interfaces
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: string;
  product_name: string;
  image_url: string;
}

interface Order {
  id: number;
  status: string;
  total_amount: string;
  created_at: string;
  user_email?: string;
  items: OrderItem[];
}

interface UserSession {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // Navigation & Views
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'admin' | 'login' | 'signup'>('catalog');
  
  // Auth state
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authIsAdmin, setAuthIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [dataSource, setDataSource] = useState<'database' | 'cache' | 'loading'>('loading');
  const [catalogLoading, setCatalogLoading] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Admin New Product Form State
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodCategory, setProdCategory] = useState('Audio');
  const [adminLoading, setAdminLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Telemetry Metrics (Visual indicators of Docker architecture stats)
  const [telemetry, setTelemetry] = useState({
    cacheHits: 0,
    dbQueries: 0,
    responseTimeMs: 45,
    activeContainers: 5
  });

  // Show dynamic toast helper
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load session from localStorage on start
  useEffect(() => {
    const stored = localStorage.getItem('ecom_session');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        setUserSession(session);
        addToast(`Welcome back, ${session.user.email}!`, 'success');
      } catch (err) {
        localStorage.removeItem('ecom_session');
      }
    }
    
    // Load local cart
    const storedCart = localStorage.getItem('ecom_cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (err) {}
    }
    
    fetchProducts();
  }, []);

  // Sync cart to localstorage
  useEffect(() => {
    localStorage.setItem('ecom_cart', JSON.stringify(cart));
  }, [cart]);

  // Fetch products from backend
  const fetchProducts = async () => {
    setCatalogLoading(true);
    setDataSource('loading');
    const start = performance.now();
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const resData = await response.json();
      setProducts(resData.data);
      setDataSource(resData.source);
      
      const duration = Math.round(performance.now() - start);
      
      // Update telemetry count
      setTelemetry(prev => ({
        ...prev,
        responseTimeMs: duration,
        cacheHits: prev.cacheHits + (resData.source === 'cache' ? 1 : 0),
        dbQueries: prev.dbQueries + (resData.source === 'database' ? 1 : 0)
      }));
    } catch (err) {
      console.error(err);
      addToast('Error communicating with backend service.', 'error');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Fetch orders
  const fetchOrders = async (token = userSession?.token) => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error();
      const resData = await response.json();
      setOrders(resData.data);
    } catch (err) {
      addToast('Failed to retrieve order history.', 'error');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Trigger loading orders when viewing tab
  useEffect(() => {
    if (activeTab === 'orders' && userSession) {
      fetchOrders();
    }
  }, [activeTab, userSession]);

  // Signup Handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      return addToast('Please enter credentials.', 'error');
    }
    setAuthLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          role: authIsAdmin ? 'admin' : 'user'
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      const session = {
        token: data.token,
        user: data.user
      };
      
      setUserSession(session);
      localStorage.setItem('ecom_session', JSON.stringify(session));
      addToast('Account created successfully!', 'success');
      setActiveTab('catalog');
      // Reset
      setAuthPassword('');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      return addToast('Please enter credentials.', 'error');
    }
    setAuthLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      const session = {
        token: data.token,
        user: data.user
      };
      
      setUserSession(session);
      localStorage.setItem('ecom_session', JSON.stringify(session));
      addToast('Successfully authenticated!', 'success');
      setActiveTab('catalog');
      // Reset
      setAuthPassword('');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setUserSession(null);
    localStorage.removeItem('ecom_session');
    setCart([]);
    addToast('Logged out successfully.', 'info');
    setActiveTab('catalog');
  };

  // Add item to cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      return addToast('Item is out of stock!', 'error');
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > product.stock) {
          addToast(`Maximum stock limit reached (${product.stock} items).`, 'error');
          return prev;
        }
        addToast(`Updated quantity of ${product.name} in cart!`, 'info');
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: newQty } 
            : item
        );
      }
      addToast(`Added ${product.name} to cart.`, 'success');
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Change quantity in cart
  const changeCartQty = (productId: number, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;
      
      const nextQty = item.quantity + delta;
      if (nextQty <= 0) {
        addToast(`Removed ${item.product.name} from cart.`, 'info');
        return prev.filter(i => i.product.id !== productId);
      }
      
      if (nextQty > item.product.stock) {
        addToast(`Only ${item.product.stock} units available in inventory.`, 'error');
        return prev;
      }
      
      return prev.map(i => 
        i.product.id === productId 
          ? { ...i, quantity: nextQty } 
          : i
      );
    });
  };

  // Remove item entirely
  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    addToast('Item removed from cart.', 'info');
  };

  // Submit Order / Checkout
  const handleCheckout = async () => {
    if (!userSession) {
      addToast('Please log in or register to complete purchase.', 'error');
      setActiveTab('login');
      setIsCartOpen(false);
      return;
    }

    if (cart.length === 0) return;

    try {
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.token}`
        },
        body: JSON.stringify({ items: orderItems })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Checkout transaction failed');
      }

      addToast(`Order #${resData.data.id} placed successfully!`, 'success');
      setCart([]); // Empty local cart
      setIsCartOpen(false);
      
      // Refresh products (since inventory changes) and telemetry database counts
      fetchProducts();
      setActiveTab('orders');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Create Product Handler (Admin)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodDesc || !prodPrice || !prodImage) {
      return addToast('Please fill out all fields.', 'error');
    }

    setAdminLoading(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession?.token}`
        },
        body: JSON.stringify({
          name: prodName,
          description: prodDesc,
          price: parseFloat(prodPrice),
          image_url: prodImage,
          stock: parseInt(prodStock),
          category: prodCategory
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to add product');
      }

      addToast(`Created product: ${resData.data.name}`, 'success');
      // Invalidate frontend view by fetching updated records
      fetchProducts();
      
      // Reset form
      setProdName('');
      setProdDesc('');
      setProdPrice('');
      setProdImage('');
      setProdStock('10');
      setProdCategory('Audio');
      
      // Switch view
      setActiveTab('catalog');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setAdminLoading(false);
    }
  };

  // Calculate totals
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      
      {/* Toast Notifications System */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast glass-panel ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--accent-neon)' }} />}
            {toast.type === 'error' && <AlertCircle size={18} style={{ color: 'var(--accent-magenta)' }} />}
            {toast.type === 'info' && <Cpu size={18} style={{ color: 'var(--accent-cyan)' }} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Navigation Header */}
      <nav className="navbar glass-panel">
        <div className="logo" onClick={() => setActiveTab('catalog')} style={{ cursor: 'pointer' }}>
          <Layers size={22} style={{ stroke: 'url(#cyan-violet-grad)' }} />
          <span>NEXUS // DEVOPS</span>
        </div>
        
        <ul className="nav-links">
          <li>
            <span 
              className={`nav-link ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              Catalog
            </span>
          </li>
          
          {userSession && (
            <li>
              <span 
                className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                Orders History
              </span>
            </li>
          )}

          {userSession?.user.role === 'admin' && (
            <li>
              <span 
                className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin Panel
              </span>
            </li>
          )}
        </ul>

        <div className="nav-actions">
          {userSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{userSession.user.email}</span>
                <span style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {userSession.user.role} role
                </span>
              </div>
              <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setActiveTab('login')}>
              <User size={16} />
              <span>Login</span>
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            onClick={() => setIsCartOpen(true)}
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={18} />
            {cartItemsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
                color: 'white',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 700,
                border: '1px solid var(--bg-primary)'
              }}>
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="app-container">
        
        {/* DevOps Infrastructure Telemetry - Extremely professional interview component! */}
        <div className="telemetry-dashboard">
          <div className="glass-panel telemetry-card">
            <div className="telemetry-icon-box" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
              <Database size={24} />
            </div>
            <div>
              <div className="telemetry-val">{telemetry.dbQueries}</div>
              <div className="telemetry-label">PostgreSQL Queries</div>
            </div>
          </div>

          <div className="glass-panel telemetry-card">
            <div className="telemetry-icon-box" style={{ background: 'rgba(138, 43, 226, 0.1)', color: 'var(--accent-violet)' }}>
              <Cpu size={24} />
            </div>
            <div>
              <div className="telemetry-val">{telemetry.cacheHits}</div>
              <div className="telemetry-label">Redis Cache Hits</div>
            </div>
          </div>

          <div className="glass-panel telemetry-card">
            <div className="telemetry-icon-box" style={{ background: 'rgba(57, 255, 20, 0.1)', color: 'var(--accent-neon)' }}>
              <Activity size={24} />
            </div>
            <div>
              <div className="telemetry-val">{telemetry.responseTimeMs}ms</div>
              <div className="telemetry-label">Microservice RTT</div>
            </div>
          </div>

          <div className="glass-panel telemetry-card">
            <div className="telemetry-icon-box" style={{ background: 'rgba(255, 0, 127, 0.1)', color: 'var(--accent-magenta)' }}>
              <Terminal size={24} />
            </div>
            <div>
              <div className="telemetry-val">{telemetry.activeContainers}</div>
              <div className="telemetry-label">Containers Active</div>
            </div>
          </div>
        </div>

        {/* View switching logic */}

        {/* 1. PRODUCT CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div>
            <div className="catalog-header">
              <div className="catalog-title">
                <h1>Seeded Gadgets Catalog</h1>
                <p>Browse our list of premium high-end tech. Cache sources are displayed dynamically on retrieval.</p>
              </div>
              <button className="btn btn-secondary" onClick={fetchProducts} disabled={catalogLoading}>
                <RefreshCw size={16} className={catalogLoading ? 'spin-anim' : ''} />
                <span>Fetch Services</span>
              </button>
            </div>

            {catalogLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: '1rem' }}>
                <RefreshCw size={40} className="spin-anim" style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Scraping microservice metrics...</span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Response Source:</span>
                  {dataSource === 'cache' ? (
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'rgba(138, 43, 226, 0.15)',
                      color: 'var(--accent-violet)',
                      border: '1px solid rgba(138, 43, 226, 0.3)'
                    }}>
                      ⚡ REDIS IN-MEMORY CACHE
                    </span>
                  ) : (
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'rgba(0, 242, 254, 0.15)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid rgba(0, 242, 254, 0.3)'
                    }}>
                      📁 POSTGRESQL DATABASE
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    (Refresh to see cache mechanism activate instantly after first load)
                  </span>
                </div>

                <div className="products-grid">
                  {products.map(product => (
                    <div key={product.id} className="glass-panel product-card">
                      <div className="product-image-wrapper">
                        <img src={product.image_url} alt={product.name} className="product-image" />
                        <span className="product-badge">{product.category}</span>
                      </div>
                      <div className="product-details">
                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-desc">{product.description}</p>
                        
                        <div className="product-meta">
                          <div>
                            <div className="product-price">${Number(product.price).toFixed(2)}</div>
                            {product.stock <= 0 ? (
                              <span className="stock-tag low-stock">OUT OF STOCK</span>
                            ) : product.stock < 5 ? (
                              <span className="stock-tag low-stock">ONLY {product.stock} LEFT</span>
                            ) : (
                              <span className="stock-tag">{product.stock} IN STOCK</span>
                            )}
                          </div>
                          
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.5rem 1rem' }}
                            onClick={() => addToCart(product)}
                            disabled={product.stock <= 0}
                          >
                            <Plus size={16} />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. ORDER HISTORY VIEW */}
        {activeTab === 'orders' && userSession && (
          <div className="orders-section">
            <div className="catalog-header">
              <div className="catalog-title">
                <h1>Order Transcripts</h1>
                <p>Verify PostgreSQL transactional order history. {userSession.user.role === 'admin' && 'Viewing ALL system transactions.'}</p>
              </div>
            </div>

            {ordersLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', minHeight: '20vh' }}>
                <RefreshCw size={30} className="spin-anim" style={{ color: 'var(--accent-cyan)' }} />
              </div>
            ) : orders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Archive size={40} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
                <h3>No order transactions discovered.</h3>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Add some gadgets to your cart and checkout!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map(order => (
                  <div key={order.id} className="glass-panel order-group">
                    <div className="order-group-header">
                      <div>
                        <span className="order-id">TRANSACTION #{order.id}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Timestamp: {new Date(order.created_at).toLocaleString()}
                        </div>
                        {order.user_email && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                            Customer: {order.user_email}
                          </div>
                        )}
                      </div>
                      <div className="order-status-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem' }}>
                          Total: ${Number(order.total_amount).toFixed(2)}
                        </span>
                        <span className={`order-status ${order.status}`}>{order.status}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {order.items.map(item => (
                        <div key={item.id} className="order-item-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <img src={item.image_url} alt={item.product_name} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                            <span>{item.product_name}</span>
                          </div>
                          <span>{item.quantity} x ${Number(item.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ADMIN PANEL VIEW */}
        {activeTab === 'admin' && userSession?.user.role === 'admin' && (
          <div className="orders-section">
            <div className="catalog-header">
              <div className="catalog-title">
                <h1>Admin Control Center</h1>
                <p>Register new microservice products and instantly invalidate the active Redis cache layer.</p>
              </div>
            </div>

            <div className="admin-section">
              <form className="glass-panel" onSubmit={handleCreateProduct} style={{ padding: '2.5rem' }}>
                <h2 className="form-legend">Register Service Product</h2>
                
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Aether Headphones"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Product Description</label>
                  <textarea 
                    className="form-input" 
                    rows={3}
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Provide professional technical specification description..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="form-group">
                  <div>
                    <label className="form-label">Price (USD)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="99.99"
                    />
                  </div>
                  <div>
                    <label className="form-label">Stock Inventory</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="form-group">
                  <div>
                    <label className="form-label">Category</label>
                    <select 
                      className="form-input" 
                      value={prodCategory} 
                      onChange={(e) => setProdCategory(e.target.value)}
                    >
                      <option value="Audio">Audio</option>
                      <option value="Peripherals">Peripherals</option>
                      <option value="Smart Devices">Smart Devices</option>
                      <option value="Decor">Decor</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Image URL</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      placeholder="Unsplash image URL"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }} disabled={adminLoading}>
                  {adminLoading ? (
                    <RefreshCw size={18} className="spin-anim" />
                  ) : (
                    <PlusCircle size={18} />
                  )}
                  <span>Publish & Invalidate Cache</span>
                </button>
              </form>

              <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>DevOps Notice</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Creating a product does two key container operations:
                </p>
                <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.8' }}>
                  <li>Adds record to **PostgreSQL** table</li>
                  <li>Executes `DEL products:all` inside the **Redis** container</li>
                </ul>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                  This guarantees that the very next catalog load will show a "CACHE MISS", triggering a fresh database read.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. LOGIN VIEW */}
        {activeTab === 'login' && (
          <div className="auth-wrapper">
            <div className="glass-panel auth-card">
              <div className="auth-header">
                <h2>Access Portal</h2>
                <p>Provide credentials to access checkout and orders.</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input 
                      type="email" 
                      className="form-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      placeholder="admin@nexus.io"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input 
                      type="password" 
                      className="form-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }} disabled={authLoading}>
                  {authLoading ? <RefreshCw size={18} className="spin-anim" /> : <CheckCircle size={18} />}
                  <span>Sign In</span>
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Don't have an account? </span>
                <span onClick={() => setActiveTab('signup')} style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600 }}>Create Portal Access</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. SIGNUP VIEW */}
        {activeTab === 'signup' && (
          <div className="auth-wrapper">
            <div className="glass-panel auth-card">
              <div className="auth-header">
                <h2>Create Access</h2>
                <p>Register a new testing portal account.</p>
              </div>

              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input 
                      type="email" 
                      className="form-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      placeholder="tester@nexus.io"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input 
                      type="password" 
                      className="form-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <input 
                    type="checkbox" 
                    id="admin-check"
                    checked={authIsAdmin}
                    onChange={(e) => setAuthIsAdmin(e.target.checked)}
                    style={{ accentColor: 'var(--accent-cyan)' }}
                  />
                  <label htmlFor="admin-check" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Grant Admin Privileges (For inventory editing)
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }} disabled={authLoading}>
                  {authLoading ? <RefreshCw size={18} className="spin-anim" /> : <CheckCircle size={18} />}
                  <span>Sign Up & Login</span>
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Already have portal access? </span>
                <span onClick={() => setActiveTab('login')} style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600 }}>Sign In</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Cart Backdrop overlay */}
      <div 
        className={`cart-backdrop ${isCartOpen ? 'open' : ''}`}
        onClick={() => setIsCartOpen(false)}
      ></div>

      {/* Cart Sidebar overlay */}
      <div className={`glass-panel cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>
            <ShoppingCart size={20} style={{ color: 'var(--accent-cyan)' }} />
            <span>Shopping Cart</span>
          </h2>
          <button className="close-btn" onClick={() => setIsCartOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} style={{ opacity: 0.3 }} />
              <p>Your shopping cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="cart-item">
                <img src={item.product.image_url} alt={item.product.name} className="cart-item-img" />
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.product.name}</div>
                  <div className="cart-item-controls">
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => changeCartQty(item.product.id, -1)}>-</button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.quantity}</span>
                      <button className="qty-btn" onClick={() => changeCartQty(item.product.id, 1)}>+</button>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <span className="cart-item-price">${(item.product.price * item.quantity).toFixed(2)}</span>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }}
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-totals">
            <span>Total Amount</span>
            <span style={{ color: 'var(--accent-cyan)' }}>${cartSubtotal.toFixed(2)}</span>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            <span>Proceed to Checkout</span>
          </button>
        </div>
      </div>

      {/* Embedded Spin Animation CSS */}
      <style>{`
        .spin-anim {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* SVG Linear Gradient definitions */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="cyan-violet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#8a2be2" />
          </linearGradient>
        </defs>
      </svg>

    </div>
  );
}
