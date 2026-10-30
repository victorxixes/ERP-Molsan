# Auditoría visual — catálogos y herramientas
Fecha: 30/10/2026  
Rama: `molsan-premium-2027-glass-luxe`  
Alcance: revisión estática, sin ejecutar importaciones ni guardar cambios en catálogos.

## Resultado
Se detectan acentos visuales heredados que no están totalmente unificados con los tokens Molsan. No se han cambiado en esta pasada para evitar una sustitución masiva de clases sin validación visual.

| Pantalla | Observación estática | Prioridad |
|---|---|---|
| `Catalogos.jsx` | Gradiente azul/índigo, tarjetas destacadas y enlaces azules; se mantiene el contraste actual. | Media |
| `CatalogoOficinas.jsx` | Botones de previsualización/importación, foco de búsqueda y hover de filas usan azul Tailwind directo. No cambiar funcionalidad de importación. | Media |
| `CatalogoAbsis.jsx` | Botón principal usa tokens Molsan, pero gradiente superior y algunos anillos de foco siguen en azul/índigo. | Baja |
| `ReglasActividadesExpediente.jsx` | Gradiente azul/índigo y bloque informativo azul heredados. | Baja |
| `DatosMolsan.jsx` | Gradiente superior y foco de campos con azul Tailwind directo. | Media |
| `TiposImpositivos.jsx` | Gradiente, rótulo y botón de guardado en índigo directo. | Media |
| `TiposConceptoGastos.jsx` | Archivo extenso con múltiples clases azul/índigo en formularios, controles y plantilla de factura. Requiere refactor por bloques, no reemplazo global. | Media-alta |
| `HonorariosGestoria.jsx` | No se detectaron clases directas azul/índigo en el recuento de esta revisión; los acentos visuales ya están neutralizados. | Revisado |

## Siguiente paso recomendado
1. Sustituir los acentos directos por tokens del sistema de diseño en bloques pequeños y comprobables.
2. Mantener colores semánticos (error, aviso, éxito) donde expresan estado, no marca.
3. Probar estados normal, hover, foco visible, deshabilitado y error antes de aceptar cada bloque.
4. Para `TiposConceptoGastos.jsx`, separar primero los estilos por componente o sección y no hacer una sustitución global.

## Limitaciones
La revisión confirma clases presentes en el código, no una diferencia visual exacta en navegador. El build de frontend no garantiza contraste, legibilidad ni consistencia visual a todos los tamaños. Las pruebas de navegador siguen pendientes.
