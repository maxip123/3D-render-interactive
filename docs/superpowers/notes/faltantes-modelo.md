# Qué trae el modelo y qué no (comparado con los renders)

Revisado cargando `web/public/model/entreaguas.glb` desde las cámaras
`PB-Vista 1–4`, `PA1-Vista 2`, `PA2-Vista1` y `Escena21`.

## Coincide con los renders
- Arquitectura completa: muros curvos, cielorrasos de madera ondulados, escalera, barras, ventanales, fachada con el letrero "Entreaguas Resto Bar".
- Mobiliario: mesas, sillas grises (PB) y bordó (pisos altos), banquetas, bancos de la fachada.
- Pisos de madera y alfombra gris con su trazado curvo.
- Las 13 cámaras: cada escena de SketchUp encuadra lo mismo que su render.

## Está en el modelo pero simplificado
- **Vegetación:** son volúmenes lisos sin textura (bultos y paneles). En el visor se pintan de verde mate. En los renders son plantas, bambú y enredaderas reales puestas por el motor de render.
- **Muro de agua:** existe la geometría, sin el efecto de agua cayendo.
- **Vidrios:** existen; afuera no hay paisaje, se ve el fondo.

## No está en el modelo
- Luz de atardecer, sombras de follaje y tiras LED encendidas (son del motor de render).
- Velas, vajilla, copas, botellas y floreros sobre las mesas y la barra.
- Espejos retroiluminados del baño con su halo de luz.

## Correcciones hechas al convertir
- Una textura del respaldo de la silla gris era una grilla de prueba de colores; se reemplazó por gris tela.
- Todos los materiales traían el mismo brillo genérico y se veían lavados; se asignó un acabado por tipo (madera, tela, metal, piedra).
