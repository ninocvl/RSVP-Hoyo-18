import { db } from '@vercel/postgres';
import Stripe from 'stripe';
import { syncToSheet } from '../lib/sheetSync.js';
import { isValidSlot, addOneHour } from '../lib/hours.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

function generateCode() {
  return 'H18-' + Math.floor(1000 + Math.random() * 9000);
}

async function releaseCard(paymentMethodId) {
  if (process.env.STRIPE_SECRET_KEY && paymentMethodId) {
    try { await stripe.paymentMethods.detach(paymentMethodId); } catch (e) { /* no bloquear la respuesta por esto */ }
  }
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
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Bloqueo por fecha+hora (no por tipo de asiento): el cupo total de 80
    // personas es compartido entre todos los tipos de asiento, asi que dos
    // reservas de la misma hora (aunque sean de asientos distintos) se
    // procesan una por vez. Reservas de otras horas no se frenan entre si.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [date + '|' + time]);

    const { rows: seatTypeRows } = await client.query(
      'SELECT total_inventory FROM seat_types WHERE code = $1',
      [seatType]
    );
    if (seatTypeRows.length === 0) {
      await client.query('ROLLBACK');
      await releaseCard(paymentMethodId);
      return res.status(200).json({ ok: false, error: 'Tipo de asiento no válido.' });
    }
    const seatInventory = seatTypeRows[0].total_inventory;

    const { rows: overlapRows } = await client.query(
      `SELECT seat_type_code, guests FROM reservations
       WHERE date = $1 AND start_time < $2 AND end_time > $3`,
      [date, endTime, time]
    );

    const totalGuestsTaken = overlapRows.reduce((sum, r) => sum + Number(r.guests), 0);
    const seatUnitsTaken = overlapRows.filter(r => r.seat_type_code === seatType).length;

    if (totalGuestsTaken + Number(guests || 0) > totalCapacity) {
      await client.query('ROLLBACK');
      await releaseCard(paymentMethodId);
      return res.status(200).json({ ok: false, error: 'Ese horario ya llegó al cupo máximo del lugar. Elegí otro horario.' });
    }
    if (seatUnitsTaken + 1 > seatInventory) {
      await client.query('ROLLBACK');
      await releaseCard(paymentMethodId);
      return res.status(200).json({ ok: false, error: 'Ese tipo de asiento se acaba de agotar para ese horario. Elegí otro.' });
    }

    const code = generateCode();
    await client.query(
      `INSERT INTO reservations (code, full_name, email, phone, guests, seat_type_code, date, start_time, end_time, stripe_customer_id, stripe_payment_method_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [code, fullName, email, phone, guests, seatType, date, time, endTime, stripeCustomerId, paymentMethodId]
    );

    await client.query('COMMIT');
    res.status(200).json({ ok: true, code });

    await syncToSheet({ action: 'reservation', code, fullName, email, phone, guests, seatType, date, time });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ya se habia cerrado la transaccion */ }
    res.status(200).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
}
