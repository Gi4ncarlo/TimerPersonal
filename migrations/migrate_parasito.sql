-- Remove old Parásito (if no purchases were made yet, otherwise we might just set is_active=false)
UPDATE shop_items SET is_active = false WHERE name = 'Parásito';

-- Insert Parásito Agresivo (Garrapata Agresiva)
INSERT INTO shop_items (name, description, cost, type, icon, is_active, metadata)
VALUES (
    'Garrapata Agresiva',
    'Robá el 65% de las ganancias del objetivo durante las próximas 48 horas.',
    6500,
    'offensive',
    '🦠',
    true,
    '{"power_type": "parasito_agresivo", "duration_hours": 48, "category": "offensive"}'::jsonb
);

-- Insert Parásito Lento (Sanguijuela)
INSERT INTO shop_items (name, description, cost, type, icon, is_active, metadata)
VALUES (
    'Sanguijuela',
    'Robá el 20% de las ganancias del objetivo durante las próximas 96 horas.',
    4000,
    'offensive',
    '🪱',
    true,
    '{"power_type": "parasito_lento", "duration_hours": 96, "category": "offensive"}'::jsonb
);
