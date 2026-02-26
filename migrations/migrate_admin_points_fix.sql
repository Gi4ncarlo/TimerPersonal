CREATE OR REPLACE FUNCTION admin_modify_user_points(
  p_admin_id UUID,
  p_target_id UUID,
  p_points numeric,
  p_reason text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role text;
BEGIN
  -- 1. Check if caller is admin
  SELECT role INTO v_admin_role FROM users WHERE id = p_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- 2. Insert the daily record
  -- The core logic of the game determines a user's balance (Sendas) purely from
  -- summing all points_calculated in the daily_records table.
  -- By inserting this record, we are modifying their balance without touching XP/Level.
  INSERT INTO daily_records (
    user_id,
    action_name,
    action_id,
    date,
    timestamp,
    duration_minutes,
    points_calculated,
    notes
  ) VALUES (
    p_target_id,
    CASE WHEN p_points > 0 THEN '👑 Ajuste de Administrador' ELSE '⚖️ Penalización de Administrador' END,
    NULL,
    (now() AT TIME ZONE 'UTC')::date,
    now() AT TIME ZONE 'UTC',
    0,
    p_points,
    p_reason
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION get_all_users_with_balance()
RETURNS TABLE (
  id UUID,
  username TEXT,
  level INTEGER,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.level,
    COALESCE(SUM(dr.points_calculated), 0) AS balance
  FROM users u
  LEFT JOIN daily_records dr ON u.id = dr.user_id
  GROUP BY u.id, u.username, u.level
  ORDER BY u.username ASC;
END;
$$;
