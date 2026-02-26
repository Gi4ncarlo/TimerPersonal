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
  v_target_xp numeric;
  v_new_xp numeric;
  v_new_level integer;
BEGIN
  -- 1. Check if caller is admin
  SELECT role INTO v_admin_role FROM users WHERE id = p_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- 2. Insert the daily record
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
    'admin-adjustment',
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
    now() AT TIME ZONE 'UTC',
    0,
    p_points,
    p_reason
  );

  -- 3. Update the target user
  SELECT xp INTO v_target_xp FROM users WHERE id = p_target_id;
  IF v_target_xp IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  v_new_xp := coalesce(v_target_xp, 0) + p_points;
  v_new_level := LEAST(50, GREATEST(1, 1 + floor(v_new_xp / 1000)));

  UPDATE users SET xp = v_new_xp, level = v_new_level WHERE id = p_target_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
