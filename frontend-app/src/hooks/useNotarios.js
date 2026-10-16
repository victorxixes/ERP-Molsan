import { useEffect, useState } from "react";
import { listarNotarios } from "../api/notarios";

/**
 * Hook auxiliar para cargar el catálogo de notarios del módulo CTN.
 * Devuelve los datos normalizados incluso si el backend responde paginado.
 */
export function useNotarios() {
  const [notarios, setNotarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setLoading(true);
      setError(null);

      try {
        const respuesta = await listarNotarios();
        const datos = respuesta?.data;
        const lista = Array.isArray(datos)
          ? datos
          : Array.isArray(datos?.items)
            ? datos.items
            : [];

        if (vigente) setNotarios(lista);
      } catch (err) {
        if (vigente) {
          setNotarios([]);
          setError(
            err?.response?.data?.detail ||
              "No se pudieron cargar los notarios. Comprueba la sesión y el acceso al módulo CTN."
          );
        }
      } finally {
        if (vigente) setLoading(false);
      }
    }

    cargar();
    return () => {
      vigente = false;
    };
  }, []);

  return { notarios, loading, error };
}

export default useNotarios;
