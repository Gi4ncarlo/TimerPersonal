-- Migration: Create strikes table
-- Esta tabla registra los "strikes" (días sin actividad) para motivar consistencia

CREATE TABLE IF NOT EXISTS strikes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strike_date DATE NOT NULL,
  reason TEXT DEFAULT 'No se registró ninguna actividad',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strike_date)
);

-- Índice para búsquedas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_strikes_user_date ON strikes(user_id, strike_date DESC);

-- Comentarios
COMMENT ON TABLE strikes IS 'Registro de días sin actividad (strikes) para sistema de motivación';
COMMENT ON COLUMN strikes.strike_date IS 'Fecha del día sin actividad (YYYY-MM-DD)';
COMMENT ON COLUMN strikes.reason IS 'Motivo del strike (generalmente falta de actividad)';
COMMENT ON COLUMN strikes.detected_at IS 'Momento en que se detectó el strike';
