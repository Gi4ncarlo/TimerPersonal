CREATE OR REPLACE FUNCTION public.purchase_offensive_power(p_user_id uuid, p_item_id uuid, p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_balance INT;
  v_item RECORD;
  v_cost INT;
  v_power_type TEXT;
  v_duration_hours INT;
  v_expires_at TIMESTAMPTZ;
  v_attacker_name TEXT;
  v_target_name TEXT;
  v_damage INT;
BEGIN
  -- You can't attack yourself
  IF p_user_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_TARGET_SELF');
  END IF;

  -- 1. Initial checks
  SELECT COALESCE(SUM(points_calculated), 0) INTO v_user_balance
  FROM daily_records WHERE user_id = p_user_id;

  SELECT username INTO v_attacker_name FROM users WHERE id = p_user_id;

  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'ITEM_NOT_FOUND'); END IF;

  v_cost := v_item.cost;
  IF v_user_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;

  -- Check if target exists
  SELECT username INTO v_target_name FROM users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'TARGET_NOT_FOUND');
  END IF;

  -- 2. Extract power info
  v_power_type := v_item.metadata->>'power_type';
  
  -- Prevent multiple active attacks of same type on same target from same user
  IF v_power_type != 'jupiter_ray' AND EXISTS (
      SELECT 1 FROM user_active_powers 
      WHERE user_id = p_user_id AND target_user_id = p_target_user_id 
      AND power_type = v_power_type AND expires_at > now()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ACTIVE_ON_TARGET');
  END IF;

  -- 3. Apply the power
  IF v_power_type = 'jupiter_ray' THEN
    
    -- Check Target Defenses (Escudo / Bóveda)
    IF EXISTS (SELECT 1 FROM user_active_powers WHERE target_user_id = p_target_user_id AND power_type = 'boveda' AND expires_at > now()) THEN
       -- Bóveda totally blocks, doesn't consume it
       INSERT INTO smart_notifications (user_id, type, title, message, context)
       VALUES (p_target_user_id, 'competitive_taunt', '🏛️ Ataque Neutralizado', v_attacker_name || ' intentó lanzarte un Rayo de Júpiter, pero tu Bóveda lo bloqueó.', '{}');
       
    ELSIF EXISTS (SELECT 1 FROM user_active_powers WHERE target_user_id = p_target_user_id AND power_type = 'escudo' AND expires_at > now()) THEN
       -- Escudo blocks and IS CONSUMED
       UPDATE user_active_powers SET expires_at = now() - interval '1 second' WHERE target_user_id = p_target_user_id AND power_type = 'escudo' AND expires_at > now();
       
       INSERT INTO smart_notifications (user_id, type, title, message, context)
       VALUES (p_target_user_id, 'competitive_taunt', '🛡️ Escudo Consumido', v_attacker_name || ' te lanzó un Rayo de Júpiter. ¡Tu escudo paró el golpe pero se ha destruido!', '{}');
    ELSE
       -- Attack succeeds
       DECLARE
         v_possible_damages INT[] := ARRAY[500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000];
       BEGIN
         -- Random damage based on specific intervals
         v_damage := v_possible_damages[floor(random() * array_length(v_possible_damages, 1) + 1)];
         
         -- Deduct target points (fix uuid and date cast)
         INSERT INTO daily_records (user_id, action_name, action_id, date, timestamp, duration_minutes, points_calculated, notes)
         VALUES (p_target_user_id, '⚡ Daño por Rayo de Júpiter', NULL, (timezone('America/Argentina/Buenos_Aires', now()))::date, now(), 0, -v_damage, 'Ataque de ' || v_attacker_name);

         -- Notify target
         INSERT INTO smart_notifications (user_id, type, title, message, context)
         VALUES (p_target_user_id, 'competitive_taunt', '⚡ ¡RAYO DE JÚPITER!', v_attacker_name || ' te ha lanzado un rayo y perdiste ' || v_damage || ' sendas.', '{}');
       END;
    END IF;

  ELSE
    -- Parásito / Sabotaje
    IF EXISTS (SELECT 1 FROM user_active_powers WHERE target_user_id = p_target_user_id AND power_type IN ('escudo', 'boveda') AND expires_at > now()) THEN
      
      -- Consume shield if it's a shield
      UPDATE user_active_powers SET expires_at = now() - interval '1 second' WHERE target_user_id = p_target_user_id AND power_type = 'escudo' AND expires_at > now();
      
      INSERT INTO smart_notifications (user_id, type, title, message, context)
      VALUES (p_target_user_id, 'competitive_taunt', '🛡️ Ataque Neutralizado', v_attacker_name || ' intentó ponerte un ' || v_power_type || ' pero tus defensas lo bloquearon.', '{}');
    ELSE
      -- Apply effect
      v_duration_hours := COALESCE((v_item.metadata->>'duration_hours')::INT, 6);
      v_expires_at := now() + (v_duration_hours || ' hours')::interval;

      INSERT INTO user_active_powers (user_id, target_user_id, attacker_id, power_type, expires_at)
      VALUES (p_user_id, p_target_user_id, p_user_id, v_power_type, v_expires_at);

      INSERT INTO smart_notifications (user_id, type, title, message, context)
      VALUES (p_target_user_id, 'competitive_taunt', '⚠️ ' || upper(v_power_type) || ' RECIBIDO', v_attacker_name || ' te aplicó un ' || v_power_type || '.', '{}');
    END IF;
  END IF;

  -- 4. Record the purchase
  INSERT INTO user_purchases (user_id, item_id, cost_paid, metadata)
  VALUES (p_user_id, p_item_id, v_cost, jsonb_build_object('type', 'offensive', 'power_type', v_power_type, 'target_id', p_target_user_id, 'target_name', v_target_name, 'damage', v_damage));

  -- 5. Deduct balance
  INSERT INTO daily_records (user_id, action_name, action_id, date, timestamp, duration_minutes, points_calculated, notes)
  VALUES (p_user_id, 'Compra: ' || v_item.name, NULL, (timezone('America/Argentina/Buenos_Aires', now()))::date, now(), 0, -v_cost, 'Ataque ejecutado');

  RETURN jsonb_build_object('success', true, 'costPaid', v_cost);
END;
$function$;
