-- Hoyo 18 RSVP: esquema de la base de datos (Vercel Postgres / Neon)
-- Para una base NUEVA, correr esto una sola vez, en Vercel > Storage > tu
-- base > pestaña Query. Si tu base ya tiene datos (venís de una version
-- anterior sin capacity_per_unit), usá migration_seat_capacity.sql en vez
-- de este archivo.

CREATE TABLE IF NOT EXISTS seat_types (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,          -- identificador unico, ej. 'mesa_4p'
  label TEXT NOT NULL,                -- texto que ve el invitado, ej. 'Mesa (4 personas)'
  capacity_per_unit INTEGER NOT NULL, -- personas que entran en 1 unidad de este tipo
  total_inventory INTEGER NOT NULL,   -- cantidad total de unidades de este tipo
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Inventario real confirmado por el cliente. Para cambiar cantidades despues,
-- alcanza con un UPDATE, por ejemplo:
--   UPDATE seat_types SET total_inventory = 12 WHERE code = 'mesa_4p';
INSERT INTO seat_types (code, label, capacity_per_unit, total_inventory, display_order) VALUES
  ('mesa_4p', 'Mesa (4 personas)', 4, 11, 1),
  ('mesa_2p', 'Mesa (2 personas)', 2, 2, 2),
  ('mesa_alta_2p', 'Mesa alta (2 personas)', 2, 6, 3),
  ('sofa_3p', 'Sofá con mesa (3 personas)', 3, 3, 4)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  guests INTEGER NOT NULL,
  seat_type_code TEXT NOT NULL REFERENCES seat_types(code),
  units INTEGER NOT NULL DEFAULT 1,   -- cuantas unidades de ese tipo se juntaron para el grupo
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,             -- hora hasta la que reservaron (informativo)
  vacated_time TIME,                  -- hora real en que el admin liberó la mesa (null = sigue ocupada)
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_date_seat ON reservations (date, seat_type_code);
CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations (date, start_time, end_time);
