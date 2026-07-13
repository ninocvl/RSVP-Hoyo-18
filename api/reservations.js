import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { date, password } = req.query;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(200).json({ ok: false, error: 'Contraseña incorrecta.' });
  }

  try {
    const { rows } = await sql`
      SELECT r.code, r.full_name, r.email, r.phone, r.guests, r.units, r.date::text AS date,
             r.start_time::text AS start_time, r.end_time::text AS end_time,
             r.vacated_time::text AS vacated_time, r.cancelled_at::text AS cancelled_at,
             r.seat_type_code, s.label AS seat_type_label, r.checked_in
      FROM reservations r
      JOIN seat_types s ON s.code = r.seat_type_code
      WHERE r.date::text = ${date}
      ORDER BY r.start_time
    `;
    const reservations = rows.map(r => ({
      code: r.code,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      guests: r.guests,
      units: r.units,
      date: r.date,
      time: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
      vacatedTime: r.vacated_time ? r.vacated_time.slice(0, 5) : null,
      cancelledAt: r.cancelled_at,
      seatType: r.seat_type_code,
      seatTypeLabel: r.seat_type_label,
      checkedIn: r.checked_in
    }));
    res.status(200).json({ ok: true, reservations });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
