CREATE TABLE customers (
 id serial PRIMARY KEY,name varchar(100) NOT NULL,email varchar(150) NOT NULL UNIQUE,
 city varchar(80),created_at timestamp DEFAULT current_timestamp
);
CREATE TABLE products (
 id serial PRIMARY KEY,name varchar(150) NOT NULL,category varchar(80) NOT NULL,
 price numeric(12,2) NOT NULL CHECK(price>=0)
);
CREATE TABLE orders (
 id serial PRIMARY KEY,customer_id integer NOT NULL REFERENCES customers(id),
 order_date date NOT NULL,status varchar(30) NOT NULL
);
CREATE TABLE order_items (
 id serial PRIMARY KEY,order_id integer NOT NULL REFERENCES orders(id),
 product_id integer NOT NULL REFERENCES products(id),quantity integer NOT NULL CHECK(quantity>0),
 unit_price numeric(12,2) NOT NULL CHECK(unit_price>=0)
);
CREATE TABLE payments (
 id serial PRIMARY KEY,order_id integer NOT NULL REFERENCES orders(id),payment_date date NOT NULL,
 amount numeric(12,2) NOT NULL CHECK(amount>=0),payment_method varchar(40) NOT NULL,status varchar(30) NOT NULL
);
INSERT INTO customers(name,email,city) VALUES
 ('Existing Customer','existing@example.com','Coimbatore');
INSERT INTO products(name,category,price) VALUES
 ('Existing Phone','Electronics',19999),('Existing Shirt','Fashion',999);
