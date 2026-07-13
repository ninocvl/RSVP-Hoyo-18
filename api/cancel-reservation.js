import { sql } from '@vercel/postgres';
import { syncToSheet } from '../lib/sheetSync.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { code, password } = req.body;
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(200).json({ ok: false, error: 'Contraseña incorrecta.' });
  }

  try {
    const { rows } = await sql`SELECT cancelled_at FROM reservations WHERE code = ${code}`;
    if (rows.length === 0) {
      return res.status(200).json({ ok: false, error: 'Código no encontrado.' });
    }

    // Toggle: si ya estaba cancelada, "des-cancelarla" (por si se toco por error).
    const isCancelling = !rows[0].cancelled_at;
    const { rows: updated } = isCancelling
      ? await sql`UPDATE reservations SET cancelled_at = now() WHERE code = ${code} RETURNING cancelled_at::text AS cancelled_at`
      : await sql`UPDATE reservations SET cancelled_at = NULL WHERE code = ${code} RETURNING cancelled_at::text AS cancelled_at`;
    const newCancelledAt = updated[0].cancelled_at;

    // Se manda antes de responder: en Vercel, el proceso puede congelarse
    // apenas se envia la respuesta, cortando cualquier await pendiente.
    await syncToSheet({ action: 'cancel', code, cancelledAt: newCancelledAt });

    res.status(200).json({ ok: true, cancelledAt: newCancelledAt });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
