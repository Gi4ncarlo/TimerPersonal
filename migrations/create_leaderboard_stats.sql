-- Migration: Create Leaderboard Stats Table
-- Esta tabla almacena las estadísticas semanales de cada usuario para el ranking

CREATE TABLE IF NOT EXISTS leaderboard_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_points INTEGER DEFAULT 0,
  positive_activities INTEGER DEFAULT 0,
  negative_activities INTEGER DEFAULT 0,
  goals_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Índice para búsquedas por semana y ordenamiento por puntos
CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON leaderboard_stats(week_start, total_points DESC);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard_stats(user_id);

-- Comentarios
COMMENT ON TABLE leaderboard_stats IS 'Estadísticas semanales para el sistema de ranking/leaderboard';
COMMENT ON COLUMN leaderboard_stats.total_points IS 'Puntos totales acumulados en la semana';
COMMENT ON COLUMN leaderboard_stats.positive_activities IS 'Número de actividades positivas realizadas';
COMMENT ON COLUMN leaderboard_stats.negative_activities IS 'Número de actividades negativas realizadas';
COMMENT ON COLUMN leaderboard_stats.goals_completed IS 'Número de objetivos completados en la semana';
