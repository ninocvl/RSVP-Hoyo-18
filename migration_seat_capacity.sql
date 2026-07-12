-- Migracion para tu base YA CREADA (la que tiene sofa/mesa/barra de prueba).
-- Corré esto una sola vez, en Vercel > Storage > tu base > pestaña Query.

-- 1) Agrega la columna nueva: cuantas personas entran por unidad de asiento.
--    No borra ni rompe nada de lo que ya existe.
ALTER TABLE seat_types ADD COLUMN IF NOT EXISTS capacity_per_unit INTEGER NOT NULL DEFAULT 1;

-- 2) Borra la reserva de prueba que hiciste al probar de punta a punta
--    (la que quedo con seat_type 'sofa', 'mesa' o 'barra'), para poder
--    borrar esos 3 tipos de referencia en el paso 3. Si preferis
--    conservarla, saltate este paso y el 3.
DELETE FROM reservations WHERE seat_type_code IN ('sofa', 'mesa', 'barra');

-- 3) Borra los 3 tipos de asiento de referencia, ya cumplieron su funcion.
DELETE FROM seat_types WHERE code IN ('sofa', 'mesa', 'barra');

-- 4) Carga el inventario real que confirmo el cliente.
INSERT INTO seat_types (code, label, capacity_per_unit, total_inventory, display_order) VALUES
  ('mesa_4p', 'Mesa (4 personas)', 4, 11, 1),
  ('mesa_2p', 'Mesa (2 personas)', 2, 2, 2),
  ('mesa_alta_2p', 'Mesa alta (2 personas)', 2, 6, 3),
  ('sofa_3p', 'Sofá con mesa (3 personas)', 3, 3, 4)
ON CONFLICT (code) DO NOTHING;
