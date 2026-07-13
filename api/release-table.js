import { sql } from '@vercel/postgres';
import { syncToSheet } from '../lib/sheetSync.js';
import { nowLocalTime } from '../lib/hours.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { code, password } = req.body;
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(200).json({ ok: false, error: 'Contraseña incorrecta.' });
  }

  try {
    const { rows } = await sql`SELECT vacated_time, cancelled_at FROM reservations WHERE code = ${code}`;
    if (rows.length === 0) {
      return res.status(200).json({ ok: false, error: 'Código no encontrado.' });
    }
    if (rows[0].cancelled_at) {
      return res.status(200).json({ ok: false, error: 'Esta reserva fue cancelada.' });
    }

    // Toggle: si ya estaba liberada, "des-liberarla" (por si se toco por error).
    const isReleasing = !rows[0].vacated_time;
    const newVacatedTime = isReleasing ? nowLocalTime() : null;

    await sql`UPDATE reservations SET vacated_time = ${newVacatedTime} WHERE code = ${code}`;
    res.status(200).json({ ok: true, vacatedTime: newVacatedTime });

    await syncToSheet({ action: 'releaseTable', code, vacatedTime: newVacatedTime });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
