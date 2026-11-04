# Matriz de solapamientos — integración Premium 2027

Fecha: 2026-11-04

## Comparación reproducible
Comparación de cada rama de trabajo contra `main`:

| Rama | Archivos distintos | Commits adelantados | Adiciones | Eliminaciones |
|---|---:|---:|---:|---:|
| `molsan-premium-2027-global` | 213 | 1.372 | 12.720 | 15.136 |
| `molsan-premium-2027-glass-luxe` | 273 | 1.613 | 26.020 | 43.167 |

La comparación directa entre ambas ramas identifica **181 rutas modificadas en las dos**: 165 de frontend, 11 de backend y 5 workflows. Por tanto, no es una integración limpia por simple orden de PR.

## Solapamientos de mayor riesgo

### Frontend y diseño
- `frontend-app/src/App.jsx`
- `frontend-app/src/components/Sidebar.jsx`
- `frontend-app/src/components/agenda/AutocompleteNotario.jsx`
- `frontend-app/src/components/empleados/ModalEmpleado.jsx`
- `frontend-app/src/components/expedientes/CarpetaDigitalModal.jsx`
- `frontend-app/src/components/expedientes/EnviarANotarioModal.jsx`
- `frontend-app/src/components/expedientes/LiquidarExpedienteModal.jsx`
- `frontend-app/src/components/expedientes/ProvisionesModal.jsx`
- `frontend-app/src/components/expedientes/TraspasoSaldoPanel.jsx`
- `frontend-app/src/components/expedientes/VisibilidadTablas.jsx`
- `frontend-app/src/components/ui/SelectSJ.jsx`
- `frontend-app/src/config/modulos.js`
- `frontend-app/src/pages/apoderagest/ApoderaGest.jsx`
- `frontend-app/src/pages/encargagest/EncargaGest.jsx`
- `frontend-app/src/pages/notargest/NotarGest.jsx`
- Hojas de estilo globales y de portales, con cambios incompatibles entre conservar/retirar archivos heredados.

### Backend y autorización
- `backend/app/Utilidades/importadores/router_absis.py`
- `backend/app/apoderagest/encargos/router.py`
- `backend/app/carpeta_digital/router.py`
- `backend/app/ctn/router.py`
- `backend/app/encargagest/router.py`
- `backend/app/expedientes/gastos/router.py`
- `backend/app/fichajes/router.py`
- `backend/app/oficinas_catalogo/router.py`
- `backend/app/provisiones/router.py`
- Pruebas de gastos y selección de tarifas.

### Workflows
- `.github/workflows/consolidacion-postfirma-checks.yml`
- `.github/workflows/control-apoderados-ci.yml`
- `.github/workflows/encargagest-checks.yml`
- `.github/workflows/frontend-build.yml`
- `.github/workflows/validar-fichajes.yml`

## Política de resolución
1. No aceptar automáticamente una versión completa de una rama para los 181 archivos compartidos.
2. Resolver por intención funcional: seguridad/autorización y lógica de negocio deben preservarse; la capa visual debe respetar el sistema común Premium 2027.
3. Para cada archivo compartido, revisar la versión de ambas ramas y conservar las dos correcciones cuando no sean excluyentes.
4. Revisar importaciones CSS antes de retirar hojas: comprobar que no se pierden reglas de layout, foco, responsive o estados funcionales.
5. No copiar archivos `.env` ni secretos. La configuración del frontend debe exigir URL explícita de API para Preview y nunca caer a producción.
6. Ejecutar pruebas tras cada bloque resuelto; no considerar suficiente que los HEAD originales tengan CI verde.

## Resultado
La integración debe realizarse por bloques revisados en `release/molsan-premium-2027-candidate`. No se ha fusionado ninguna rama ni se ha desplegado nada.
