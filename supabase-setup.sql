-- =============================================
-- JagoJualan - Supabase Table Setup
-- =============================================
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS analisis (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  harga_jual INTEGER NOT NULL,
  harga_kompetitor INTEGER NOT NULL,
  strategi_judul TEXT DEFAULT '',
  analisis_visual TEXT DEFAULT '',
  saran_taktik TEXT DEFAULT '',
  wa_copy TEXT DEFAULT '',
  ig_copy TEXT DEFAULT '',
  en_title TEXT DEFAULT '',
  en_desc TEXT DEFAULT ''
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE analisis ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts and reads (for the anon key)
CREATE POLICY "Allow anonymous inserts" ON analisis
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous reads" ON analisis
  FOR SELECT TO anon
  USING (true);

-- Create index for faster sorting by created_at
CREATE INDEX IF NOT EXISTS idx_analisis_created_at ON analisis (created_at DESC);
