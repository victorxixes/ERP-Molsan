# MOLSAN ERP PREMIUM 2027 — Sistema de diseño

## Objetivo
Una única identidad visual y una biblioteca compartida para todos los módulos. Los módulos aportan contenido y comportamiento; no crean paletas, cabeceras ni componentes visuales independientes.

## Fuente de verdad
- Tokens CSS: `src/css/NeutralizarPresentacion.css`.
- Utilidades Tailwind corporativas: `src/css/index.css`, conectadas a los tokens mediante `@theme inline`.
- Sidebar: excluido del rediseño; conserva `SidebarBase.css` y su implementación actual.
- El Layout es el único propietario del margen exterior del área de trabajo.

## Paleta corporativa
| Token | Valor | Uso |
|---|---|---|
| `--molsan-blue` | `#064675` | Marca, títulos, iconos y acción primaria |
| `--molsan-white` | `#FFFFFF` | Fondo principal y superficies |
| `--molsan-panel` | `#F2F7FB` | Paneles y superficies secundarias |
| `--molsan-table-head` | `#EAF2F8` | Cabeceras de tablas |
| `--molsan-border` | `#D8E4EC` | Bordes y separadores |
| `--molsan-muted` | `#617789` | Texto secundario |
| `--molsan-text` | `#18364B` | Texto principal |

Los colores de estado solo comunican éxito, advertencia, error o información. Nunca asignan una identidad cromática distinta a un módulo.

## Escalas compartidas
- Tipografía: familia Inter con alternativas del sistema; escala de 12 a 24 px.
- Espaciado: escala de 4 px y sus múltiplos.
- Densidad de tablas: equilibrada; fila base de 44 px.
- Controles: 32, 38 y 42 px.
- Radios: 6, 9, 12 y 16 px.
- Elevación: sombras discretas en tarjetas, popovers y modales.
- Interacción: foco visible y transiciones breves.

## Reglas de arquitectura
1. No añadir colores hexadecimales directamente en componentes.
2. No crear CSS de presentación por módulo.
3. No duplicar padding exterior en las páginas; Layout controla el gutter.
4. Los componentes compartidos definen estructura y variantes; las páginas solo los componen.
5. Mantener intactos datos, permisos, validaciones, API y flujos funcionales.
6. Mantener intacto el Sidebar.

## Orden de construcción
1. Tokens y escalas (primera entrega).
2. Primitivas compartidas: botón, tarjeta, campo, tabla, pestaña, alerta y modal.
3. Cabecera y contenedor de página únicos.
4. Dashboard como pantalla piloto y patrón geométrico.
5. Migración progresiva módulo por módulo, validando cada pantalla en Preview.
