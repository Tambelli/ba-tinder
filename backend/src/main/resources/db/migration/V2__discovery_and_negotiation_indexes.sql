CREATE INDEX IF NOT EXISTS idx_creators_discovery ON creators (engagement DESC, followers DESC, id);
CREATE INDEX IF NOT EXISTS idx_deals_creator ON deals (creator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_events_deal ON deal_events (deal_id, created_at);
