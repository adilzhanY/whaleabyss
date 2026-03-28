-- migrations.sql
-- Инициализирующий скрипт базы данных для платформы "Whale Abyss"
-- Написан с учетом стандартов PostgreSQL.

-- Подключение расширения для генерации UUID, если используется старая версия PostgreSQL 
-- (в версиях 13+ можно использовать встроенный gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Типы данных (ENUMs) для статусов и ролей
CREATE TYPE user_role AS ENUM ('user', 'admin', 'booster');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'in_progress', 'completed', 'cancelled');

-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ (Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Здесь будут храниться хэши паролей (например, bcrypt/argon2)
    role user_role DEFAULT 'user',
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ТАБЛИЦА КАТЕГОРИЙ УСЛУГ (Categories)
-- Например: "Мондштадт", "Фарм примогемов"
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ТАБЛИЦА УСЛУГ (Services)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2), -- Старая цена для отображения скидок
    duration_estimate VARCHAR(100), -- Оценка времени (например, "2-3 часа")
    image_url VARCHAR(255),
    is_popular BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ТАБЛИЦА ЗАКАЗОВ (Orders)
-- Содержит общую информацию о покупке/корзине
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- если юзер удален, заказ остается для истории
    status order_status DEFAULT 'pending',
    total_price DECIMAL(10, 2) NOT NULL,
    payment_id VARCHAR(255), -- ID транзакции в платежной системе
    user_notes TEXT, -- Пожелания к заказу от клиента (например, данные аккаунта в зашифрованном виде, хотя лучше отдельную таблицу)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ТАБЛИЦА ПОЗИЦИЙ В ЗАКАЗЕ (Order_Items)
-- Связывает конкретный заказ с услугами (чтобы можно было купить сразу 3 услуги)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    price_at_purchase DECIMAL(10, 2) NOT NULL, -- Фиксируем цену на момент покупки!
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ТАБЛИЦА ОТЗЫВОВ (Reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ИНДЕКСЫ для ускорения работы БД
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Триггер для автоматического обновления updated_at (Пример: функция и её привязка)
-- CREATE OR REPLACE FUNCTION update_modified_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = now();
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';
-- 
-- CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
