-- Migration: Create vacation_periods table
-- Sistema de bitácora de vacaciones para evitar strikes durante períodos declarados

CREATE TABLE IF NOT EXISTS vacation_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Notification tracking
  notified_start BOOLEAN DEFAULT FALSE,
  notified_end_warning BOOLEAN DEFAULT FALSE,
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT max_duration CHECK (end_date - start_date <= 30)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_vacation_user_dates 
  ON vacation_periods(user_id, start_date, end_date);

-- Comments
COMMENT ON TABLE vacation_periods IS 'Períodos de vacaciones declarados para evitar strikes';
COMMENT ON COLUMN vacation_periods.start_date IS 'Fecha de inicio del período (YYYY-MM-DD)';
COMMENT ON COLUMN vacation_periods.end_date IS 'Fecha de fin del período (YYYY-MM-DD)';
COMMENT ON COLUMN vacation_periods.reason IS 'Motivo declarado por el usuario';
COMMENT ON COLUMN vacation_periods.notified_start IS 'Si se envió notificación de inicio';
COMMENT ON COLUMN vacation_periods.notified_end_warning IS 'Si se envió notificación de fin próximo';
