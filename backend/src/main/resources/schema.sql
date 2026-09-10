CREATE TABLE IF NOT EXISTS creators (
 id BIGINT PRIMARY KEY, name VARCHAR(100) NOT NULL, handle VARCHAR(80) NOT NULL,
 creator_niche VARCHAR(60) NOT NULL, product_niche VARCHAR(60) NOT NULL,
 state VARCHAR(2) NOT NULL, city VARCHAR(100) NOT NULL, followers BIGINT NOT NULL,
 engagement DECIMAL(5,2) NOT NULL, bio VARCHAR(600) NOT NULL, color VARCHAR(20) NOT NULL
);
CREATE TABLE IF NOT EXISTS deals (
 id VARCHAR(36) PRIMARY KEY, brand_id VARCHAR(80) NOT NULL, creator_id BIGINT NOT NULL REFERENCES creators(id),
 budget_cents BIGINT NOT NULL CHECK (budget_cents > 0), commission_cents BIGINT NOT NULL,
 execution_cents BIGINT NOT NULL, total_cents BIGINT NOT NULL,
 commission_mode VARCHAR(20) NOT NULL, match_mode VARCHAR(20) NOT NULL,
 status VARCHAR(40) NOT NULL, brief VARCHAR(1500) NOT NULL,
 owner VARCHAR(100), created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL,
 UNIQUE (brand_id, creator_id)
);
CREATE TABLE IF NOT EXISTS deal_events (
 id VARCHAR(36) PRIMARY KEY, deal_id VARCHAR(36) NOT NULL REFERENCES deals(id),
 actor VARCHAR(80) NOT NULL, status VARCHAR(40) NOT NULL, note VARCHAR(1000) NOT NULL,
 created_at VARCHAR(40) NOT NULL
);
