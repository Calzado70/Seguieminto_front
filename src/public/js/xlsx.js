/* ============================================================
 * xlsx.js — Exportación a Excel única del frontend (Fase 4.1d)
 *
 * Seis módulos repetían la misma secuencia de SheetJS:
 *   book_new -> *_to_sheet -> book_append_sheet -> writeFile
 * además del nombre de archivo a mano y, en dos casos, los anchos
 * de columna.
 *
 * Solo una vista (historial) cargaba el CDN de SheetJS. Las otras
 * cinco funcionaban porque ese script ya estaba en memoria por el
 * orden de carga: si el orden cambiaba, o si se abría una de esas
 * vistas directamente, XLSX no existía y la exportación reventaba.
 * Aquí la librería se carga bajo demanda, la primera vez que hace
 * falta, y solo una vez.
 *
 * Uso:
 *   await exportarXlsx({
 *     filas: datos,                  // array de objetos o de arrays
 *     tipo: "json",                  // "json" (defecto) | "aoa"
 *     hoja: "Historial",             // nombre de la pestaña
 *     archivo: "Historial_2026.xlsx",
 *     anchos: [18, 14, 20],          // opcional, anchos de columna
 *   });
 *
 * Devuelve una promesa. Lanza si no hay filas, si la vista no pasa
 * datos válidos o si el CDN no responde, para que el módulo decida
 * cómo avisar con su propio toast/modal.
 * ============================================================ */

(function () {
    "use strict";

    // Misma versión y CDN que ya usaba views.historial.ejs, para no
    // cambiar el formato de los archivos que genera la aplicación.
    var CDN =
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

    var cargaEnCurso = null;

    function hayLibreria() {
        return typeof window.XLSX !== "undefined" && window.XLSX !== null;
    }

    /**
     * Carga SheetJS del CDN si no está ya en memoria.
     * Las llamadas concurrentes comparten la misma promesa.
     */
    function cargarLibreria() {
        if (hayLibreria()) return Promise.resolve();

        if (cargaEnCurso) return cargaEnCurso;

        cargaEnCurso = new Promise(function (resolver, rechazar) {
            var script = document.createElement("script");
            script.src = CDN;
            script.async = true;

            script.onload = function () {
                if (hayLibreria()) {
                    resolver();
                } else {
                    // El script cargó pero no dejó XLSX definido: CDN
                    // devolviendo otra cosa. No reintentar en bucle.
                    cargaEnCurso = null;
                    rechazar(new Error("La librería de Excel cargó incompleta."));
                }
            };

            script.onerror = function () {
                cargaEnCurso = null;
                rechazar(
                    new Error(
                        "No se pudo cargar la librería de Excel. Revisa la conexión.",
                    ),
                );
            };

            document.head.appendChild(script);
        });

        return cargaEnCurso;
    }

    var MIME_XLSX =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /**
     * Escribe un .xlsx y lo descarga.
     *
     * @param {object} opciones
     * @param {Array}  opciones.filas    Filas ya transformadas por el módulo.
     * @param {string} [opciones.tipo]   "json" (defecto) o "aoa".
     * @param {string} [opciones.hoja]   Nombre de la pestaña (defecto "Hoja1").
     * @param {string} opciones.archivo  Nombre del archivo, con .xlsx.
     * @param {Array}  [opciones.anchos] Anchos de columna en caracteres.
     * @param {object} [opciones.opcionesHoja] Opciones para json_to_sheet,
     *                                        por ejemplo { header: [...] }.
     * @param {boolean} [opciones.devolverBlob] Si es true no dispara la
     *        descarga y devuelve el Blob para que el módulo lo gestione.
     * @returns {Promise<Blob|void>}
     */
    window.exportarXlsx = async function (opciones) {
        var cfg = opciones || {};

        if (!Array.isArray(cfg.filas) || cfg.filas.length === 0) {
            throw new Error("No hay datos para exportar.");
        }

        if (!cfg.archivo && !cfg.devolverBlob) {
            throw new Error("Falta el nombre del archivo.");
        }

        await cargarLibreria();

        var XLSX = window.XLSX;
        var ws;

        if (cfg.tipo === "aoa") {
            ws = XLSX.utils.aoa_to_sheet(cfg.filas);
        } else {
            ws = XLSX.utils.json_to_sheet(cfg.filas, cfg.opcionesHoja || {});
        }

        if (Array.isArray(cfg.anchos) && cfg.anchos.length) {
            ws["!cols"] = cfg.anchos.map(function (ancho) {
                return { wch: ancho };
            });
        }

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, cfg.hoja || "Hoja1");

        if (cfg.devolverBlob) {
            var datos = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            return new Blob([datos], { type: MIME_XLSX });
        }

        XLSX.writeFile(wb, cfg.archivo);
    };

    /**
     * Descarga un Blob con el nombre indicado. Complementa a
     * exportarXlsx({ devolverBlob: true }) para los módulos que
     * necesitan controlar ellos mismos el momento de la descarga.
     */
    window.descargarBlob = function (blob, nombreArchivo) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");

        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Expuesto por si hay que esperar a la librería desde otro sitio.
    window.cargarLibreriaXlsx = cargarLibreria;
})();
