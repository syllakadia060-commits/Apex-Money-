Create Custom Enumerated Actor Roles
CREATE TYPE account_role AS ENUM ('OWNER', 'AGENT', 'USER');
CREATE TYPE tx_type AS ENUM ('CASH_IN', 'CASH_OUT', 'P2P', 'BILL_PAYMENT');

-- 2. Master Accounts Table (Stores balances with precise numeric limits)
CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    role account_role NOT NULL DEFAULT 'USER',
    balance_gnf NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_balance CHECK (balance_gnf >= 0) -- Stops balances from dropping below 0
);

-- 3. Immutable Transaction Ledger (Every movement of money is logged here)
CREATE TABLE ledger (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL, -- Prevents accidental duplicate button clicks
    transaction_type tx_type NOT NULL,
    sender_id VARCHAR(50) REFERENCES accounts(id),
    receiver_id VARCHAR(50) REFERENCES accounts(id),
    principal_amount NUMERIC(15, 2) NOT NULL,
    fee_charged NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_principal CHECK (principal_amount > 0)
);

-- 4. Speed Optimization Indexes (Makes balance lookups instant on mobile phones)
CREATE INDEX idx_accounts_phone ON accounts(phone_number);
CREATE INDEX idx_ledger_sender ON ledger(sender_id);
CREATE INDEX idx_ledger_receiver ON ledger(receiver_id);


-- =====================================================================
-- 5. SEED INITIAL NETWORK NODES (Simulating Conakry Setup)
-- =====================================================================
INSERT INTO accounts (id, phone_number, account_holder_name, role, balance_gnf) VALUES
('OWNER_MAIN', '+224620000000', 'Apex Money Corporate Treasury', 'OWNER', 500000000.00), -- 500 Million GNF
('AGENT_01',   '+224629999999', 'Kaloum Kiosk Terminal',        'AGENT',  10000000.00), -- 10 Million GNF Float
('USER_01',    '+224621111111', 'Mamady Camara',                'USER',     250000.00); -- 250,000 GNF
 -- Temporary tracking verification schema for user security loops
CREATE TABLE phone_verifications (
    phone_number VARCHAR(15) PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0
);

-- Index optimization to enable lightning-fast cron data purging later
CREATE INDEX idx_otp_expiry ON phone_verifications(expires_at);
-- Merchant Business Profile Directory Schema
CREATE TABLE merchants (
    merchant_id VARCHAR(50) PRIMARY KEY REFERENCES accounts(id),
    business_name VARCHAR(100) NOT NULL,
    store_location VARCHAR(150),
    qr_payload_string TEXT UNIQUE NOT NULL -- Holds the immutable string signature read by the app camera
);

-- Seed a mock merchant business profile operating in Conakry
INSERT INTO merchants (merchant_id, business_name, store_location, qr_payload_string) VALUES
('OWNER_MAIN', 'Apex Telecom & Supermarket', 'Avenue de la République, Kaloum', 'apex-money:merchant:OWNER_MAIN');
 -- Automated Nightly Financial Audit Log Schema
CREATE TABLE daily_reconciliation_logs (
    audit_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    total_system_float NUMERIC(15, 2) NOT NULL,
    total_platform_fees NUMERIC(15, 2) NOT NULL,
    unreconciled_discrepancy NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL, -- 'BALANCED' or 'DISCREPANCY_ALERT'
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
