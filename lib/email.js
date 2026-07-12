// Envio de email de confirmacion via Resend (REST API directa, sin SDK,
// para no repetir el error que tuvimos con Stripe: nada se inicializa a
// nivel de modulo, todo pasa dentro de la funcion y esta protegido con
// try/catch. Si falla o no esta configurado, no bloquea la reserva.

const FROM_ADDRESS = process.env.RESEND_FROM || 'Hoyo 18 <onboarding@resend.dev>';

function formatDateEs(dateStr) {
  const labels = {
    '2026-07-15': 'miércoles 15 de julio',
    '2026-07-16': 'jueves 16 de julio',
    '2026-07-17': 'viernes 17 de julio',
    '2026-07-18': 'sábado 18 de julio',
    '2026-07-19': 'domingo 19 de julio'
  };
  return labels[dateStr] || dateStr;
}

export async function sendConfirmationEmail({ to, fullName, code, date, time, seatTypeLabel, guests }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#16232f;">
      <h1 style="font-size:22px;">Reserva confirmada</h1>
      <p>Hola ${fullName}, tu lugar en el Sky Box del Hoyo 18 quedó confirmado.</p>
      <div style="background:#f5f0e6;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Código:</strong> ${code}</p>
        <p style="margin:0 0 8px;"><strong>Día:</strong> ${formatDateEs(date)}</p>
        <p style="margin:0 0 8px;"><strong>Hora:</strong> ${time}</p>
        <p style="margin:0 0 8px;"><strong>Asiento:</strong> ${seatTypeLabel}</p>
        <p style="margin:0;"><strong>Personas:</strong> ${guests}</p>
      </div>
      <p style="font-size:13px;color:#666;">Guardá este código, te lo van a pedir al llegar. Tu tarjeta solo quedó como garantía, no se te cobró nada.</p>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject: `Reserva confirmada · ${code}`,
        html
      })
    });
  } catch (err) {
    console.error('sendConfirmationEmail fallo (no afecta la reserva):', err.message);
  }
}
