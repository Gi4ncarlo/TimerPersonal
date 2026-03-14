-- ═══════════════════════════════════════════════════
-- WEEKLY TOURNAMENTS SYSTEM
-- ═══════════════════════════════════════════════════

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS tournament_participants CASCADE;
DROP TABLE IF EXISTS weekly_tournaments CASCADE;

-- Weekly Tournaments table
CREATE TABLE weekly_tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🏆',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    winner_id UUID REFERENCES auth.users(id),
    winner_username TEXT,
    reward_multiplier NUMERIC DEFAULT 1.5,
    reward_duration_hours INTEGER DEFAULT 48,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(week_start)
);

-- Tournament Participants / Scores
CREATE TABLE tournament_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES weekly_tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    username TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    rank INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_tournaments_week_start ON weekly_tournaments(week_start);
CREATE INDEX idx_tournaments_status ON weekly_tournaments(status);
CREATE INDEX idx_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_participants_user ON tournament_participants(user_id);
CREATE INDEX idx_participants_rank ON tournament_participants(tournament_id, rank);

-- Enable RLS
ALTER TABLE weekly_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read tournaments and participants
CREATE POLICY "Anyone can read tournaments"
    ON weekly_tournaments FOR SELECT USING (true);
CREATE POLICY "Anyone can read participants"
    ON tournament_participants FOR SELECT USING (true);

-- Authenticated users can manage tournaments
CREATE POLICY "Auth users can insert tournaments"
    ON weekly_tournaments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update tournaments"
    ON weekly_tournaments FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Authenticated users can manage their own participation
CREATE POLICY "Auth users can insert participants"
    ON tournament_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update participants"
    ON tournament_participants FOR UPDATE USING (auth.uid() IS NOT NULL);
