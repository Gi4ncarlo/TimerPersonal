CREATE OR REPLACE FUNCTION public.apply_parasite_effect(
    p_attacker_id uuid,
    p_target_id uuid,
    p_stolen_points int,
    p_parasite_name text,
    p_emoji text,
    p_percentage_text text,
    p_victim_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- 1. Apply negative adjustment to the victim
  INSERT INTO daily_records (user_id, action_name, action_id, date, timestamp, duration_minutes, points_calculated, notes)
  VALUES (
    p_target_id, 
    p_emoji || ' Puntos Robados', 
    NULL,
    (timezone('America/Argentina/Buenos_Aires', now()))::date, 
    now(), 
    0, 
    -p_stolen_points, 
    'Robado por un ataque de ' || p_parasite_name
  );

  -- 2. Apply gains to the attacker
  INSERT INTO daily_records (user_id, action_name, action_id, date, timestamp, duration_minutes, points_calculated, notes)
  VALUES (
    p_attacker_id, 
    p_emoji || ' Ganancia por ' || p_parasite_name, 
    NULL,
    (timezone('America/Argentina/Buenos_Aires', now()))::date, 
    now(), 
    0, 
    p_stolen_points, 
    'Robado de un objetivo (' || p_percentage_text || ')'
  );

  -- 3. Notify Attacker
  INSERT INTO smart_notifications (user_id, type, title, message, context)
  VALUES (
    p_attacker_id, 
    'system', 
    '¡Robo exitoso!', 
    'Tu poder ' || p_parasite_name || ' le robó ' || p_stolen_points || ' sendas a ' || p_victim_name || '.', 
    '{}'
  );

  -- 4. Notify Victim
  INSERT INTO smart_notifications (user_id, type, title, message, context)
  VALUES (
    p_target_id, 
    'alert', 
    '¡Te han robado sendas!', 
    'Sufriste el efecto de ' || p_parasite_name || '. Perdiste ' || p_stolen_points || ' sendas en tu última actividad.', 
    '{}'
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
