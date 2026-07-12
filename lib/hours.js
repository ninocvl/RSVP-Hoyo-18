// Horario de atencion por dia de la semana. getDay(): 0=domingo, 1=lunes, ...
// Lunes y martes no aparecen: el establecimiento esta cerrado esos dias.
export const OPENING_HOURS = {
  3: { open: '11:00', close: '19:00' }, // Miercoles
  4: { open: '11:00', close: '19:00' }, // Jueves
  5: { open: '12:00', close: '20:00' }, // Viernes
  6: { open: '12:00', close: '20:00' }, // Sabado
  0: { open: '12:00', close: '20:00' }  // Domingo
};

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Fechas del evento (Sky Box PGA Championship 2026). Si esto pasa a ser un
// sistema recurrente para cualquier fecha, esta lista es lo unico que
// habria que cambiar por un rango abierto.
export const EVENT_DATES = ['2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19'];

export function getHoursForDate(dateStr) {
  const day = new Date(dateStr + 'T12:00:00Z').getUTCDay();
  return OPENING_HOURS[day] || null;
}

// Franjas de 1 hora dentro del horario de atencion de esa fecha, ej. ["11:00","12:00",...]
export function getHourSlots(dateStr) {
  const hours = getHoursForDate(dateStr);
  if (!hours) return [];
  const slots = [];
  let t = toMinutes(hours.open);
  const end = toMinutes(hours.close);
  while (t < end) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    t += 60;
  }
  return slots;
}

export function isValidSlot(dateStr, startTime) {
  if (!EVENT_DATES.includes(dateStr)) return false;
  return getHourSlots(dateStr).includes(startTime);
}

export function addOneHour(hhmm) {
  const mins = toMinutes(hhmm) + 60;
  const h = String(Math.floor(mins / 60) % 24).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}
