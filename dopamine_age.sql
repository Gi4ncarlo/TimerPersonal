CREATE TABLE dopamine_age (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  real_age INTEGER NOT NULL,
  dopamine_age INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  weekly_delta INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  survey_completed BOOLEAN DEFAULT FALSE,
  survey_answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE dopamine_age_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dopamine_age INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  status TEXT NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
