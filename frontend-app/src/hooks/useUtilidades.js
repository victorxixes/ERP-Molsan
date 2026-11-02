import { useState } from "react";
import axios from "../api/axios";
import { API_BASE } from "../api/config";  

const API = API_BASE;

/**
 * Hook premium SJ‑2026
 * Utilidades del ERP:
 * - Importar CTN (Excel)
 * - Crear noticia
 * - Subir documento
 * Incluye:
 * - Estado de carga
 * - Resultado
 * - Manejo de errores
 */
export function useUtilidades() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  // ---------------------------
  // IMPORTAR CTN
  // ---------------------------
  const importarCTN = async (file) => {
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("fichero", file);

      const res = await axios.post(`${API}/utilidades/ctn/importar`, form);
      setResultado(res.data);
      return res.data;
    } catch (err) {
      setError("Error al importar CTN");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // CREAR NOTICIA
  // ---------------------------
  const crearNoticia = async (titulo, descripcion) => {
    try {
      const res = await axios.post(`${API}/intranet/noticias`, {
        titulo,
        descripcion,
      });
      return res.data;
    } catch {
      setError("Error al crear noticia");
      return null;
    }
  };

  // ---------------------------
  // SUBIR DOCUMENTO
  // ---------------------------
  const subirDocumento = async (titulo, concepto, fichero) => {
    try {
      const form = new FormData();
      form.append("titulo", titulo);
      form.append("concepto", concepto);
      form.append("fichero", fichero);

      const res = await axios.post(`${API}/intranet/documentos`, form);
      return res.data;
    } catch {
      setError("Error al subir documento");
      return null;
    }
  };

  return {
    loading,
    resultado,
    error,

    importarCTN,
    crearNoticia,
    subirDocumento,
  };
}
