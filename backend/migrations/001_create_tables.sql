-- LOME Documents Management - Database Schema
-- Azure SQL Database

-- Users table
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'distributor')),
    company NVARCHAR(255) NOT NULL,
    country NVARCHAR(100) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    last_login DATETIME2 NULL
);

-- Products table
CREATE TABLE Products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_name NVARCHAR(500) NOT NULL,
    formula_number NVARCHAR(100) NOT NULL UNIQUE,
    barcode NVARCHAR(100) NULL,
    ean_code NVARCHAR(100) NULL,
    brand NVARCHAR(255) NOT NULL,
    division NVARCHAR(255) NOT NULL,
    category NVARCHAR(255) NULL,
    shade_name NVARCHAR(255) NULL,
    shade_code NVARCHAR(100) NULL,
    pack_size NVARCHAR(100) NULL,
    description NVARCHAR(MAX) NULL,
    created_by INT NULL REFERENCES Users(id),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Documents table
CREATE TABLE Documents (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
    document_type NVARCHAR(50) NOT NULL,
    file_name NVARCHAR(500) NOT NULL,
    blob_name NVARCHAR(1000) NOT NULL,
    blob_url NVARCHAR(2000) NOT NULL,
    file_size INT NOT NULL,
    content_type NVARCHAR(100) NOT NULL,
    description NVARCHAR(1000) NULL,
    expiry_date DATE NULL,
    country_specific NVARCHAR(100) NULL,
    download_count INT NOT NULL DEFAULT 0,
    uploaded_by INT NULL REFERENCES Users(id),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Activity log table
CREATE TABLE ActivityLog (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL REFERENCES Users(id),
    action NVARCHAR(50) NOT NULL,
    document_id INT NULL,
    product_id INT NULL REFERENCES Products(id),
    details NVARCHAR(1000) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes
CREATE INDEX IX_Products_formula ON Products(formula_number);
CREATE INDEX IX_Products_barcode ON Products(barcode);
CREATE INDEX IX_Products_ean ON Products(ean_code);
CREATE INDEX IX_Products_brand ON Products(brand);
CREATE INDEX IX_Products_division ON Products(division);
CREATE INDEX IX_Documents_product ON Documents(product_id);
CREATE INDEX IX_Documents_type ON Documents(document_type);
CREATE INDEX IX_Documents_expiry ON Documents(expiry_date);
CREATE INDEX IX_ActivityLog_user ON ActivityLog(user_id);
CREATE INDEX IX_ActivityLog_date ON ActivityLog(created_at);
