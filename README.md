# Hoyo 18 · RSVP: guía de puesta en marcha (backend nuevo en Vercel)

El backend real ya no vive en Google Apps Script: ahora es una API en Vercel
(carpeta `/api`) con una base de datos Postgres. Apps Script quedó como una
copia de respaldo para el equipo, opcional, y no bloquea ninguna reserva si
falla. Seguí este orden.

## 1. Base de datos Postgres (5 min)

1. En el dashboard de Vercel, entrá a tu proyecto (`RSVP-Hoyo-18`) > pestaña **Storage**.
2. Creá una base **Postgres** (Neon, integrado en Vercel, plan Free alcanza) y conectala a este proyecto. Esto agrega solo las variables de entorno de conexión automáticamente, no hace falta copiarlas a mano.
3. Andá a la pestaña **Query** de esa base y pegá el contenido de `schema.sql` (crea las tablas `seat_types` y `reservations`, con el inventario de referencia: 8 sofás, 10 mesas, 16 de barra). Ejecutalo una sola vez.
4. Cuando el cliente confirme el inventario real, actualizalo con un `UPDATE`, por ejemplo:
   ```sql
   UPDATE seat_types SET total_inventory = 12 WHERE code = 'sofa';
   ```

## 2. Variables de entorno en Vercel (5 min)

Settings > Environment Variables, agregá:

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | la contraseña del equipo del evento |
| `STRIPE_SECRET_KEY` | `sk_test_...` (nunca la publishable) |
| `CAPACITY_TOTAL` | `80` (personas simultáneas en todo el lugar) |
| `APPS_SCRIPT_SYNC_URL` | opcional, ver paso 3 |

El inventario por tipo de asiento (sofás, mesas, barra) no es una variable de
entorno: vive en la tabla `seat_types` de la base de datos, se edita con un
`UPDATE` directo desde la pestaña Query (ver paso 1.4).

Las de conexión a Postgres (`POSTGRES_URL` y similares) ya quedaron cargadas solas en el paso 1.

También hay que cargar la **Stripe Publishable key** directo en `index.html`, en `CONFIG.STRIPE_PUBLISHABLE_KEY` (esa sí es segura de tener en el frontend).

## 3. Apps Script: copia de respaldo en la Sheet (opcional, 10 min)

Este paso es solo si querés que el equipo siga viendo las reservas en una
Google Sheet además del panel de admin. Si no, se puede saltar entero, la
reserva funciona igual sin esto.

1. Creá una Google Sheet nueva, nombrala "Hoyo 18 - Reservas".
2. Extensiones > Apps Script, borrá el contenido default y pegá el `Code.gs` de esta carpeta (es la versión nueva, mucho más chica: solo recibe una copia de cada reserva y la escribe en la Sheet).
3. Configuración del proyecto > Propiedades del script, agregá `SYNC_SECRET` con una clave cualquiera inventada por vos.
4. Implementar > Nueva implementación > Aplicación web. Ejecutar como "Yo", acceso "Cualquier usuario".
5. Copiá la URL que termina en `/exec`, agregale `?secret=TU_SYNC_SECRET` al final, y ese texto completo va en la variable de entorno `APPS_SCRIPT_SYNC_URL` de Vercel (paso 2).

## 4. Deploy

Con el repo ya conectado a Vercel, cada push a `main` hace el deploy solo.
Al agregar `package.json` y la carpeta `/api`, Vercel detecta que ahora hay
funciones serverless y las instala/despliega automáticamente, no hace falta
configurar nada extra de build.

## 5. Antes del evento

- [ ] Probar una reserva de punta a punta con la tarjeta de prueba de Stripe (`4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC).
- [ ] Confirmar que el check-in en `/admin.html` funciona con la reserva de prueba.
- [ ] Activar la cuenta de Stripe en modo real y reemplazar `pk_test_.../sk_test_...` por `pk_live_.../sk_live_...` (la pública en `index.html`, la secreta en las variables de entorno de Vercel).
- [ ] Confirmar `CAPACITY_TOTAL` (80 personas) y el inventario real de `seat_types` (sofás, mesas, barra) apenas el cliente lo confirme.

## Cómo funciona la disponibilidad ahora

Cada reserva es de un solo tipo de asiento (sofá, mesa o barra), por una hora
exacta, dentro del horario de atención de ese día (Miércoles y Jueves 11am a
7pm, Viernes a Domingo 12pm a 8pm, Lunes y Martes cerrado). Una reserva se
rechaza si se pasa el cupo total de 80 personas simultáneas, o si ya no
queda inventario de ese tipo de asiento en ese horario, lo que ocurra
primero. El backend usa un bloqueo por fecha y hora (no uno global): dos
reservas de la misma hora se procesan una por vez, pero horas distintas no
se frenan entre sí. Si alguien llega tarde a un horario que se acaba de
llenar, se le libera la tarjeta guardada automáticamente (no queda nada
retenido) y se le pide elegir otro horario u otro tipo de asiento.
