CREATE OR REPLACE FUNCTION public.purchase_cosmetic(p_user_id uuid, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_balance INT;
  v_item RECORD;
  v_cost INT;
  v_cosmetic_type TEXT;
  v_cosmetic_value TEXT;
BEGIN
  -- 1. Check if user exists and get balance
  SELECT COALESCE(SUM(points_calculated), 0) INTO v_user_balance
  FROM daily_records
  WHERE user_id = p_user_id;

  -- 2. Get item details
  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ITEM_NOT_FOUND');
  END IF;

  v_cost := v_item.cost;
  
  IF v_user_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE', 'balance', v_user_balance, 'cost', v_cost);
  END IF;

  -- 3. Extract cosmetic metadata
  v_cosmetic_type := v_item.metadata->>'cosmetic_type';
  v_cosmetic_value := v_item.metadata->>'cosmetic_value';

  -- 4. Update user profile based on cosmetic type
  IF v_cosmetic_type = 'avatar' THEN
    UPDATE users SET cosmetic_avatar = v_cosmetic_value WHERE id = p_user_id;
  ELSIF v_cosmetic_type = 'name_color' THEN
    UPDATE users SET name_color = v_cosmetic_value WHERE id = p_user_id;
  ELSIF v_cosmetic_type = 'name_title' THEN
    UPDATE users SET name_title = v_cosmetic_value WHERE id = p_user_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_COSMETIC_TYPE');
  END IF;

  -- 5. Record the purchase
  INSERT INTO user_purchases (user_id, item_id, cost_paid, metadata)
  VALUES (p_user_id, p_item_id, v_cost, 
    jsonb_build_object(
      'type', 'cosmetic',
      'cosmetic_type', v_cosmetic_type,
      'cosmetic_value', v_cosmetic_value
    )
  );

  -- 6. Deduct balance via a negative daily_record
  INSERT INTO daily_records (user_id, action_name, action_id, date, timestamp, duration_minutes, points_calculated, notes)
  VALUES (
    p_user_id, 
    'Compra en Tienda: ' || v_item.name, 
    NULL, 
    (timezone('America/Argentina/Buenos_Aires', now()))::date, 
    now(), 
    0, 
    -v_cost,
    'Compra de cosmético'
  );

  RETURN jsonb_build_object('success', true, 'costPaid', v_cost, 'newBalance', v_user_balance - v_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_defensive_power(p_user_id uuid, p_item_id uuid)
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
BEGIN
  -- 1. Initial checks
  SELECT COALESCE(SUM(points_calculated), 0) INTO v_user_balance
  FROM daily_records WHERE user_id = p_user_id;

  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'ITEM_NOT_FOUND'); END IF;

  v_cost := v_item.cost;
  IF v_user_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;

  -- 2. Extract power info
  v_power_type := v_item.metadata->>'power_type';
  
  -- If escudo, it lasts until consumed, arbitrary far future or e.g., 30 days
  IF v_power_type = 'escudo' THEN
    v_expires_at := now() + interval '30 days';
  ELSE
    v_duration_hours := COALESCE((v_item.metadata->>'duration_hours')::INT, 24);
    v_expires_at := now() + (v_duration_hours || ' hours')::interval;
  END IF;

  -- Check if already has an active power of same type
  IF EXISTS (SELECT 1 FROM user_active_powers WHERE target_user_id = p_user_id AND power_type = v_power_type AND expires_at > now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ACTIVE');
  END IF;

  -- 3. Insert active power (for defensive, target_user_id = user_id)
  INSERT INTO user_active_powers (user_id, target_user_id, power_type, expires_at)
  VALUES (p_user_id, p_user_id, v_power_type, v_expires_at);

  -- 4. Record the purchase
  INSERT INTO user_purchases (user_id, item_id, cost_paid, metadata)
  VALUES (p_user_id, p_item_id, v_cost, jsonb_build_object('type', 'defensive', 'power_type', v_power_type));

  -- 5. Deduct balance
  INSERT INTO daily_records (user_id, action_name, action_id, date, timestamp, duration_minutes, points_calculated, notes)
  VALUES (
    p_user_id, 'Compra: ' || v_item.name, NULL, 
    (timezone('America/Argentina/Buenos_Aires', now()))::date, now(), 0, -v_cost, 'Defensa activada'
  );

  RETURN jsonb_build_object('success', true, 'costPaid', v_cost);
END;
$function$;
