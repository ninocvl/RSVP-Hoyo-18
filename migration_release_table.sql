-- Migracion: permite que el admin libere una mesa manualmente en vez de
-- que se libere sola despues de 1 hora fija. Correr una sola vez en
-- Vercel > Storage > tu base > pestaña Query. No borra ni rompe nada de
-- lo que ya existe.

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vacated_time TIME;
