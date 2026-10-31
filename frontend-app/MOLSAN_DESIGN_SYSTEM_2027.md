# MOLSAN ERP PREMIUM 2027 — Sistema de diseño

## Propósito
Construir una experiencia empresarial coherente, sobria y de alta calidad. La interfaz debe priorizar claridad, ritmo visual, lectura rápida y consistencia entre módulos. La identidad corporativa se mantiene fija: no se introducen paletas alternativas ni tipografías decorativas.

## Fuente de verdad
- Tokens y base visual: `src/css/NeutralizarPresentacion.css`.
- Utilidades Tailwind 4: `src/css/index.css`, conectadas a los tokens mediante `@theme inline`.
- Orden de carga: la neutralización visual se importa después de los estilos de módulos.
- Sidebar: expresamente excluido; conservar estructura, estilos, iconos, hover y comportamiento.
- El Layout es el único propietario del margen exterior del área de trabajo. Las páginas no duplican gutter, centrado ni ancho máximo.

## Identidad corporativa invariable

| Token | Valor | Uso |
|---|---|---|
| `--molsan-white` | `#FFFFFF` | Fondo principal y superficies |
| `--molsan-panel` | `#F2F7FB` | Paneles y superficies secundarias |
| `--molsan-table-head` | `#EAF2F8` | Cabeceras de tablas |
| `--molsan-border` | `#D8E4EC` | Bordes y separadores |
| `--molsan-blue` | `#064675` | Marca, títulos, iconos y acción primaria |
| `--molsan-muted` | `#617789` | Texto secundario |
| `--molsan-text` | `#18364B` | Texto principal |

Tipografía única: Inter, con alternativas de sistema. No cargar fuentes remotas ni cambiar la familia como parte de esta fase.

Los colores de éxito, advertencia, error e información son semánticos y solo se usan para comunicar estados funcionales. Nunca asignan una identidad cromática a un módulo.

## Fase 1 — Fundamentos visuales ampliados

### 1. Superficies y equilibrio
- Blanco como superficie dominante.
- Azul hielo reservado a agrupaciones, paneles secundarios y cabeceras de tabla.
- No convertir cada bloque en una tarjeta: agrupar solo cuando exista relación funcional.
- Bordes finos y sombras discretas; evitar contornos dobles y elevaciones acumuladas.
- Las tarjetas son blancas y se distinguen por jerarquía, espaciado y borde, no por grandes bloques de color.

### 2. Jerarquía tipográfica
- Escala común de 12 a 24 px.
- Títulos de página en azul Molsan; títulos de sección claramente subordinados.
- Texto principal con contraste suficiente y texto auxiliar en gris azulado.
- Pesos tipográficos limitados a normal, medio, seminegrita y negrita.
- Evitar mayúsculas sostenidas, tamaños arbitrarios y exceso de negritas.

### 3. Ritmo y espaciado
- Escala base de 4 px.
- Separación entre secciones coherente y mayor que la separación entre elementos relacionados.
- Padding interior de tarjetas y formularios uniforme.
- El Layout define el gutter exterior; las páginas no añaden otro margen global.
- No reducir el espacio hasta dificultar la lectura ni ampliarlo hasta desperdiciar área útil.

### 4. Geometría y alineación
- Todas las páginas comienzan en la misma coordenada útil.
- Ancho disponible, alineación superior y márgenes laterales dependen del Layout compartido.
- Cabeceras, contenido, filtros y tablas comparten ejes de alineación.
- Los elementos de una misma familia mantienen alturas y proporciones equivalentes.
- En pantallas estrechas, las columnas se reorganizan sin crear scroll horizontal de página.

### 5. Densidad de trabajo
- Densidad predeterminada equilibrada.
- Filas de tabla base de 44 px; variantes compacta y cómoda solo cuando el contexto lo justifique.
- Controles de formulario con alturas normalizadas.
- Datos tabulares, importes y fechas alineados de forma consistente.
- No sacrificar legibilidad para introducir más información en pantalla.

### 6. Bordes, radios y elevación
- Radios compartidos y limitados a una escala pequeña.
- Sombras muy sutiles para tarjetas; elevación superior reservada a popovers y modales.
- No apilar sombras en contenedores anidados.
- Separadores en azul hielo corporativo, sin líneas oscuras innecesarias.

### 7. Estados e interacción
- Hover discreto, sin cambios bruscos de color ni desplazamientos de layout.
- Foco visible para navegación por teclado.
- Estados deshabilitados, carga, vacío, éxito y error con tratamiento uniforme.
- Transiciones breves; respetar `prefers-reduced-motion`.
- No usar colores semánticos como decoración.

### 8. Accesibilidad y legibilidad
- Mantener contraste suficiente en texto, iconos y controles.
- No comunicar estados únicamente mediante color.
- Respetar zoom del navegador y tamaños de texto.
- Mantener el orden de lectura y la navegación por teclado.
- Evitar animaciones no esenciales cuando el usuario solicita movimiento reducido.

## Reglas de arquitectura
1. No introducir nuevos colores de marca ni códigos hexadecimales aislados en componentes.
2. No crear CSS de presentación específico por módulo.
3. No duplicar padding exterior, gutter, centrado ni max-width en las páginas.
4. Los tokens son la fuente única de valores visuales compartidos.
5. Los componentes compartidos definirán estructura y variantes; las páginas compondrán contenido y comportamiento.
6. Mantener intactos datos, permisos, validaciones, API y flujos funcionales.
7. Mantener intacto el Sidebar.
8. No hacer sustituciones masivas de clases sin comprobar su función estructural y accesible.

## Orden de construcción posterior
1. Completar y validar estos fundamentos visuales.
2. Fase 2: lenguaje visual compartido (cabeceras, contenedores, superficies y patrones).
3. Fase 3: biblioteca Molsan UI (botones, tarjetas, campos, tablas, pestañas, alertas y modales).
4. Fase 4: Dashboard y una pantalla operativa como piloto.
5. Fase 5: migración progresiva módulo por módulo.
6. Fase 6: auditoría visual, accesibilidad, resoluciones e interacciones.

## Criterio de aceptación de la Fase 1
- Paleta y tipografía corporativas intactas.
- Tokens centrales completos y conectados a Tailwind.
- Fondo, superficies, jerarquía, espaciado y densidad definidos.
- Sidebar y comportamiento funcional sin cambios.
- Build de producción frontend correcto.
- La validación visual por pantallas se documenta por separado; un deploy correcto no equivale a una auditoría visual completa.
