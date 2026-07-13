-- Migracion: permite juntar varias unidades del mismo tipo de asiento
-- cuando un grupo no entra en una sola (ej. 2 mesas de 4 para 7 personas).
-- Correr una sola vez en Vercel > Storage > tu base > pestaña Query.
-- No borra ni rompe nada de lo que ya existe.

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS units INTEGER NOT NULL DEFAULT 1;
