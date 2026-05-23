-- Initial setup script for e-commerce database

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- Seed initial products
INSERT INTO products (name, description, price, image_url, stock, category) VALUES
('Aether X1 Quantum Headphones', 'Immerse yourself in acoustic perfection with quantum audio drivers, hybrid adaptive ANC (up to 48dB), and a premium glassmorphic housing with dynamic RGB ring indicators.', 299.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 25, 'Audio'),
('Nova-Keys Mechanical Keyboard', 'Ultra-responsive optical hot-swappable switches, sound-dampened gasket-mounted polycarbonate plate, and per-key reactive neon backlighting with wireless multi-device pairing.', 189.50, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 40, 'Peripherals'),
('HoloGrid Portable Projector', 'Projects breathtaking 4K UHD imagery onto any flat surface with intelligent auto-keystone correction, 2500 ANSI Lumens, and 3D object rendering capabilities in a pocket-sized form factor.', 499.00, 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 15, 'Smart Devices'),
('Hyperion Wireless Gaming Mouse', 'Carbon-fiber frame featuring an 80,000 DPI sub-micron sensor, customizable modular side-plates, and dynamic wireless charging compatibility via desktop magnetic pads.', 149.99, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 50, 'Peripherals'),
('Nebula Aura ambient Lamp', 'A mesmerizing smart lamp utilizing ferrofluid acoustics and high-density LEDs that react in real-time to your system''s performance, creating deep-space galaxy effects.', 89.00, 'https://images.unsplash.com/photo-1507646227500-4d389b0012be?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 30, 'Decor');
