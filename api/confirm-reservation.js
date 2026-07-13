import { db } from '@vercel/postgres';
import { syncToSheet } from '../lib/sheetSync.js';
import { sendConfirmationEmail } from '../lib/email.js';
import { isValidSlot, addOneHour, effectiveEndTime } from '../lib/hours.js';
import { releaseCard } from '../lib/stripeCard.js';

function generateCode() {
  return 'H18-' + Math.floor(1000 + Math.random() * 9000);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { fullName, email, phone, guests, date, time, seatType, stripeCustomerId, paymentMethodId } = req.body;
  const totalCapacity = Number(process.env.CAPACITY_TOTAL || 80);

  if (!isValidSlot(date, time)) {
    await releaseCard(paymentMethodId);
    return res.status(200).json({ ok: false, error: 'Ese día u horario no está disponible.' });
  }

  const endTime = addOneHour(time);
  let client;

  try {
    client = await db.connect();
    await client.query('BEGIN');

    // Bloqueo por fecha+hora (no por tipo de asiento): el cupo total de 80
    // personas es compartido entre todos los tipos de asiento, asi que dos
    // reservas de la misma hora (aunque sean de asientos distintos) se
    // procesan una por vez. Reservas de otras horas no se frenan entre si.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [date + '|' + time]);

    const { rows: seatTypeRows } = await client.query(
      'SELECT label, total_inventory, capacity_per_unit FROM seat_types WHERE code = $1',
      [seatType]
    );
    if (seatTypeRows.length === 0) {
      await client.query('ROLLBACK');
      await releaseCard(paymentMethodId);
      return res.status(200).json({ ok: false, error: 'Tipo de asiento no válido.' });
    }
    const seatTypeLabel = seatTypeRows[0].label;
    const seatInventory = seatTypeRows[0].total_inventory;
    const capacityPerUnit = seatTypeRows[0].capacity_per_unit;

    // Si el grupo no entra en 1 sola unidad, se juntan varias del mismo
    // tipo (ej. 2 mesas de 4 para un grupo de 7).
    const unitsNeeded = Math.ceil(Number(guests || 0) / capacityPerUnit);
    if (unitsNeeded > seatInventory) {
      await client.query('ROLLBACK');
      await releaseCard(paymentMethodId);
      return res.status(200).json({ ok: false, error: `Ese tipo de asiento no tiene suficientes unidades para ${guests} personas (hay ${seatInventory} en total, entran ${capacityPerUnit} por unidad). Elegí otro tipo de asiento o reducí el grupo.` });
    }

    // Ocupacion real: una reserva sigue bloqueando su mesa desde que
    // empieza hasta que un admin la libera (vacated_time), o hasta el
    // cierre del dia si nadie la libero todavia. Ya no se libera sola
    // despues de 1 hora fija.
    const { rows: dateRows } = await client.query(
      `SELECT seat_type_code, guests, units, start_time::text AS start_time,
              vacated_time::text AS vacated_time
       FROM reservations WHERE date = $1 AND cancelled_at IS NULL`,
      [date]
    );
    const overlapRows = dateRows.filter(r => {
      const start = r.start_time.slice(0, 5);
      const vacated = r.vacated_time ? r.vacated_time.slice(0, 5) : null;
      const end = effectiveEndTime(date, vacated);
      return start < endTime && end > time;
    });

    const totalGuestsTaken = overlapRows.reduce((sum, r) => sum + Number(r.guests), 0);
    const seatUnitsTaken = overlapRows
      .filter(r => r.seat_type_code === seatType)
      .reduce((sum, r) => sum + Number(r.units || 1), 0);

    if (totalGuestsTaken + Number(guests || 0) > totalCapacity) {
      await client.query('ROLLBACK');
      await releaseCard(paymentMethodId);
      return res.status(200).json({ ok: false, error: 'Ese horario ya llegó al cupo máximo del lugar. Elegí otro horario.' });
    }
    if (seatUnitsTaken + unitsNeeded > seatInventory) {
      await client.query('ROLLBACK');
      await releaseCard(paymentMethodId);
      const remaining = Math.max(0, seatInventory - seatUnitsTaken);
      return res.status(200).json({ ok: false, error: `Necesitás ${unitsNeeded} unidades de ese asiento para tu grupo, pero solo quedan ${remaining} libres a esa hora. Elegí otro horario o tipo de asiento.` });
    }

    const code = generateCode();
    await client.query(
      `INSERT INTO reservations (code, full_name, email, phone, guests, seat_type_code, units, date, start_time, end_time, stripe_customer_id, stripe_payment_method_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [code, fullName, email, phone, guests, seatType, unitsNeeded, date, time, endTime, stripeCustomerId, paymentMethodId]
    );

    await client.query('COMMIT');

    // Se manda antes de responder: en Vercel, el proceso puede congelarse
    // apenas se envia la respuesta, cortando cualquier await pendiente.
    await syncToSheet({ action: 'reservation', code, fullName, email, phone, guests, seatType, date, time });
    await sendConfirmationEmail({ to: email, fullName, code, date, time, seatTypeLabel, guests });

    res.status(200).json({ ok: true, code, units: unitsNeeded });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (e) { /* ya se habia cerrado la transaccion */ }
    }
    console.error('confirm-reservation fallo:', err);
    await releaseCard(paymentMethodId);
    res.status(200).json({ ok: false, error: 'No pudimos confirmar la reserva. Probá de nuevo en un momento.' });
  } finally {
    if (client) client.release();
  }
}
