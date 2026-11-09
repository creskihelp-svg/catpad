-- ==============================================================================
-- CatPad Supabase Schema Migration
-- Production-ready PostgreSQL schema with Row Level Security (RLS) & Policies
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Charities Table
CREATE TABLE IF NOT EXISTS public.charities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    ein_tax_id TEXT,
    website TEXT NOT NULL,
    wallet_address TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    total_donations_sol NUMERIC(18, 6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Launches Table
CREATE TABLE IF NOT EXISTS public.launches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mint TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    metadata_uri TEXT NOT NULL,
    creator_wallet TEXT NOT NULL,
    charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
    donation_bps INTEGER NOT NULL CHECK (donation_bps >= 500 AND donation_bps <= 10000), -- 5% to 100%
    is_immutable BOOLEAN DEFAULT TRUE,
    tx_signature TEXT NOT NULL UNIQUE,
    config_pda TEXT,
    twitter TEXT,
    telegram TEXT,
    website TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    market_cap_sol NUMERIC(18, 6) DEFAULT 28.5,
    bonding_curve_progress NUMERIC(5, 2) DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Donations Table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    launch_id UUID REFERENCES public.launches(id) ON DELETE SET NULL,
    charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
    amount_sol NUMERIC(18, 6) NOT NULL CHECK (amount_sol >= 0),
    tx_signature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
    distribution_type TEXT NOT NULL DEFAULT 'fee_share_distribution' CHECK (distribution_type IN ('fee_share_distribution', 'initial_dev_pledge', 'direct_donation')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Admin Users / Roles Table
CREATE TABLE IF NOT EXISTS public.admin_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read access
CREATE POLICY "Public read access for charities" ON public.charities FOR SELECT USING (true);
CREATE POLICY "Public read access for confirmed launches" ON public.launches FOR SELECT USING (true);
CREATE POLICY "Public read access for confirmed donations" ON public.donations FOR SELECT USING (true);

-- Admin write policies checked via auth.uid() in admin_roles
CREATE POLICY "Admins can manage charities" ON public.charities
    FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE admin_roles.user_id = auth.uid()));

CREATE POLICY "Admins can manage launches" ON public.launches
    FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE admin_roles.user_id = auth.uid()));

CREATE POLICY "Admins can manage donations" ON public.donations
    FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE admin_roles.user_id = auth.uid()));
