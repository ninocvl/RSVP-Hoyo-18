import { sql } from '@vercel/postgres';
import { EVENT_DATES, getHourSlots, addOneHour } from '../lib/hours.js';

export default async function handler(req, res) {
  try {
    const requestedDate = req.query.date;
    const dates = requestedDate ? [requestedDate] : EVENT_DATES;
    const totalCapacity = Number(process.env.CAPACITY_TOTAL || 80);

    const { rows: seatTypes } = await sql`
      SELECT code, label, total_inventory FROM seat_types ORDER BY display_order
    `;
    const { rows: reservations } = await sql`
      SELECT date::text AS date, start_time::text AS start_time, end_time::text AS end_time,
             seat_type_code, guests
      FROM reservations
      WHERE date = ANY(${dates})
    `;

    const availability = {};
    for (const date of dates) {
      const slots = getHourSlots(date);
      const dateReservations = reservations.filter(r => r.date === date);
      availability[date] = {};

      for (const slot of slots) {
        const slotEnd = addOneHour(slot);
        const overlapping = dateReservations.filter(r => {
          const start = r.start_time.slice(0, 5);
          const end = r.end_time.slice(0, 5);
          return start < slotEnd && end > slot;
        });

        const takenBySeat = {};
        let totalGuests = 0;
        for (const r of overlapping) {
          takenBySeat[r.seat_type_code] = (takenBySeat[r.seat_type_code] || 0) + 1;
          totalGuests += Number(r.guests);
        }

        const seats = {};
        for (const st of seatTypes) {
          seats[st.code] = Math.max(0, st.total_inventory - (takenBySeat[st.code] || 0));
        }

        availability[date][slot] = {
          seats,
          totalGuestsRemaining: Math.max(0, totalCapacity - totalGuests)
        };
      }
    }

    res.status(200).json({
      ok: true,
      seatTypes: seatTypes.map(st => ({ code: st.code, label: st.label, totalInventory: st.total_inventory })),
      availability
    });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
