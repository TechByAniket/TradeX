-- Add nullable NSE snapshot reference columns to existing stocks table.
-- Preserves all existing simulated columns, constraints, and indexes.
ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS industry VARCHAR(120),
  ADD COLUMN IF NOT EXISTS nse_reference_price DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS nse_previous_close DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS nse_change DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS nse_percent_change DECIMAL(10, 4),
  ADD COLUMN IF NOT EXISTS nse_day_high DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS nse_day_low DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS nse_year_high_52w DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS nse_year_low_52w DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS nse_volume DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS market_cap_cr DECIMAL(18, 2),
  ADD COLUMN IF NOT EXISTS quote_date VARCHAR(30),
  ADD COLUMN IF NOT EXISTS quote_time VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nse_quote_fetched_at TIMESTAMPTZ(6);
