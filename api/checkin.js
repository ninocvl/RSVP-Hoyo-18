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
    const { rows } = await sql`SELECT checked_in FROM reservations WHERE code = ${code}`;
    if (rows.length === 0) {
      return res.status(200).json({ ok: false, error: 'Código no encontrado.' });
    }
    const newState = !rows[0].checked_in;
    await sql`UPDATE reservations SET checked_in = ${newState} WHERE code = ${code}`;
    res.status(200).json({ ok: true, checkedIn: newState });

    await syncToSheet({ action: 'checkin', code, checkedIn: newState });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
