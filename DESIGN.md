# Hoyo 18 RSVP — sistema de diseño

## Concepto
Lounge náutico-golf en la terraza del hoyo 18, tomado directo del render de marca:
carpas azul marino, mobiliario color hueso, madera de teca, mar turquesa de fondo.
Casa Costa aporta el mundo náutico (timón, azul profundo, serif tallada). Solution
Services aporta el acento de marca secundaria — se usa pequeño, nunca compitiendo
con Casa Costa.

## Color
```
--navy-950: #081a30   fondo más oscuro, secciones ancla, footer
--navy-800: #0f2a4a   superficie principal, headers, botones primarios
--navy-700: #1b3c61   hover / bordes sobre navy
--cream:    #f5f0e6   fondo de página, tarjetas
--sand:     #e8ddc8   superficies secundarias, inputs, slots ocupados
--wood:     #8a6a45   acento cálido — usar con moderación (líneas, focus, bordes activos)
--ocean:    #3f7f92   acento fresco — disponibilidad, éxito, check-in
--ink:      #16232f   texto principal sobre cream
--white:    #ffffff   texto sobre navy
```
Nada de beige/crema genérico "AI default": el cream aquí es el color real de la
lona/mobiliario del render, no un neutro de relleno.

## Tipografía
- **Display — Fraunces**: titulares, código de confirmación, "Hoyo 18", números.
  Peso 500–600, optical size alto en headlines grandes.
- **UI/Body — Work Sans**: formulario, labels, texto de apoyo, botones.
- Ambas por Google Fonts. Nunca Inter/Roboto/Arial como face principal.

## Firma visual
Ícono lineal propio: timón náutico fusionado con una bandera de golf marcando
"18" en el centro. Aparece una vez en el hero (grande, watermark sutil) y una
vez en la pantalla de confirmación. No se repite como decoración de relleno.

## Componentes
- **Selector de fecha**: píldoras 16–19 jul. Activo = navy sólido + texto blanco.
- **Selector de hora**: grid de franjas. Llena = sand apagado, texto con opacidad
  reducida (no rojo de alarma, no candado). Disponible = borde wood al hover.
- **Campo de tarjeta**: Stripe Element dentro de un campo de formulario normal
  (mismo alto, mismo radio que los demás inputs). Nunca doble bisel ni tarjeta
  anidada — es un input más, con el candado del navegador como única señal de
  seguridad necesaria.
- **Confirmación**: pantalla de éxito a página completa con código, resumen y
  botón de WhatsApp. No modal.
- **Admin / check-in**: lista de tarjetas grandes, un tap para marcar llegada,
  buscador arriba, sin tablas densas — pensado para pulgar en cancha.

## Motion
- 200–260ms, `ease-out` cúbico. Nada de bounce.
- El hero hace un solo fade + rise al cargar. Sin reveals repetidos en scroll.
- `prefers-reduced-motion` respetado: todo colapsa a crossfade instantáneo.

## Assets de marca
- Logo Casa Costa: navy sobre transparente, usar en fondos claros.
- Logo Solution Services: full color, usar pequeño, alineado al lado de Casa
  Costa — nunca a mayor tamaño que Casa Costa (es el afiliado anfitrión).
