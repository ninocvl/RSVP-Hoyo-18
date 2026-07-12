// Copia de cortesia hacia Google Sheets, para que el equipo la siga viendo
// como antes. Nunca debe frenar ni romper la respuesta real al usuario: si
// Apps Script esta lento o caido, se ignora el error y sigue todo igual.
export async function syncToSheet(payload) {
  const url = process.env.APPS_SCRIPT_SYNC_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('syncToSheet fallo (no afecta la reserva):', err.message);
  }
}
