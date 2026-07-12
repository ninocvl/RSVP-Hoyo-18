/**
 * HOYO 18: sincronizacion a Google Sheets (copia de respaldo del equipo)
 * ---------------------------------------------------------
 * Este script YA NO es el backend real de las reservas. La logica de
 * reservas, cupo, pagos y contraseña de admin ahora vive en Vercel
 * (carpeta /api) + una base de datos Postgres.
 *
 * El unico trabajo de este script es recibir una copia de cada reserva y
 * cada check-in desde el backend de Vercel, y escribirla en esta Sheet para
 * que el equipo la siga viendo como antes. Si este script falla o esta
 * lento, no afecta ninguna reserva real, solo la copia de respaldo.
 *
 * CONFIGURACION REQUERIDA (Extensiones > Apps Script > Configuracion del
 * proyecto > Propiedades del script):
 *   SYNC_SECRET -> una clave cualquiera que solo conozca el backend de
 *                  Vercel (no la compartan en ningun lado publico)
 *   SHEET_ID    -> solo si este script NO se abrio desde Extensiones >
 *                  Apps Script dentro de la Sheet
 *
 * Columnas de la pestaña "Reservas" (se crean solas si no existen):
 *   Timestamp | Código | Nombre | Email | Teléfono | Personas | Asiento |
 *   Fecha | Hora | Check-in | Liberada
 *
 * Deploy: Implementar > Nueva implementación > Aplicación web
 *   - Ejecutar como: Yo (tu cuenta)
 *   - Quién tiene acceso: Cualquier usuario
 *   La URL /exec que te da esto, con "?secret=TU_SYNC_SECRET" al final, va
 *   en la variable de entorno APPS_SCRIPT_SYNC_URL de tu proyecto en Vercel.
 *   IMPORTANTE: guardar código NO actualiza la URL /exec en vivo. Hay que
 *   crear una "Nueva versión" en Gestionar implementaciones cada vez que se
 *   publique un cambio.
 */

const SHEET_NAME = 'Reservas';
const HEADERS = ['Timestamp','Código','Nombre','Email','Teléfono','Personas','Asiento','Fecha','Hora','Check-in','Liberada'];

function getSpreadsheet_(){
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) {
    throw new Error('Este script no esta vinculado a una Sheet. Agrega la propiedad SHEET_ID (Configuracion del proyecto > Propiedades del script) con el ID de tu Google Sheet.');
  }
  return SpreadsheetApp.openById(id);
}

function ensureSheet_(){
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
   doPost: recibe la copia desde Vercel (reserva nueva o check-in)
   ========================================================= */
function doPost(e){
  try{
    const cfg = PropertiesService.getScriptProperties();
    const secret = cfg.getProperty('SYNC_SECRET');
    if (secret && e.parameter.secret !== secret) {
      return jsonOut_({ ok:false, error:'No autorizado.' });
    }

    const body = JSON.parse(e.postData.contents);
    if (body.action === 'reservation') return jsonOut_(addReservation_(body));
    if (body.action === 'checkin') return jsonOut_(updateCheckin_(body));
    if (body.action === 'releaseTable') return jsonOut_(updateReleaseTable_(body));
    return jsonOut_({ ok:false, error:'Acción no reconocida.' });
  }catch(err){
    return jsonOut_({ ok:false, error: err.message });
  }
}

function addReservation_(body){
  const sheet = ensureSheet_();
  sheet.appendRow([
    new Date(), body.code, body.fullName, body.email, body.phone, body.guests,
    body.seatType, body.date, body.time, false, ''
  ]);
  return { ok:true };
}

function updateCheckin_(body){
  const sheet = ensureSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++){
    if (values[i][1] === body.code) {
      sheet.getRange(i + 1, 10).setValue(body.checkedIn); // columna J = Check-in
      return { ok:true };
    }
  }
  return { ok:false, error:'Código no encontrado para sincronizar.' };
}

function updateReleaseTable_(body){
  const sheet = ensureSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++){
    if (values[i][1] === body.code) {
      sheet.getRange(i + 1, 11).setValue(body.vacatedTime || ''); // columna K = Liberada
      return { ok:true };
    }
  }
  return { ok:false, error:'Código no encontrado para sincronizar.' };
}
