# Calce de las 13 vistas con sus renders

Comparado a ojo en el navegador: modelo desde la escena de SketchUp contra el render.

| Vista | Escena de SketchUp | fov | Resultado |
|---|---|---|---|
| fachada | Escena21 | 60 | Calza: letrero, puerta y bancos coinciden. |
| pb-a | PB-Vista 1 | 46 | Misma dirección; el render tiene las mesas más cerca. |
| pb-b | PB-Vista 2 | 50 | Calza: escalera, barra y jardineras. |
| pb-c | PB-Vista 3 | 47 | Calza: escalera, barra y mesa en primer plano. |
| pb-d | PB-Vista 4 | 58 | Misma dirección; el render muestra espejos que el modelo no tiene. |
| p1-a | PA1-Vista 1 | 50 | Calza. |
| p1-b | PA1-Vista 2 | 50 | Calza. |
| p1-c | PA-Vista 3 | 47 | Calza: escalera, barra y plantas. |
| p1-d | PA-Vista 4 | 50 | Calza: barra en primer plano. |
| p2-a | PA2-Vista1 | 50 | Calza: barra al centro, muro de agua al fondo. |
| p2-b | PA2-Vista 2 | 50 | Misma dirección; el modelo muestra una baranda que el render omite. |
| p2-c | PA2-Vista 3 | 46 | Calza: barra a la izquierda, muro de agua. |
| p2-d | PA2-Vista 4 | 50 | Calza: banqueta y mesa. |

La correspondencia escena ↔ render por nombre resultó correcta en las 13.

Límite: los renders interiores no son una foto exacta del modelo. Cambian la
posición de algunas mesas, la forma de algún cielorraso y agregan o quitan
elementos. Por eso el fundido modelo ↔ render coincide en arquitectura general,
no pieza por pieza. El campo de visión no venía en el archivo y se estimó a ojo.
