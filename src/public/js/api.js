/* ============================================================
 * api.js — Cliente HTTP único del frontend (Fase 4.1)
 *
 * Sustituye el `http://localhost:4000` hardcodeado en 18 ficheros
 * JS. Antes cada módulo repetia tres cosas a mano:
 *   - la URL base del backend
 *   - el header Authorization con el token
 *   - el parseo de errores y el manejo del 401
 *
 * Ahora eso vive aquí. Se carga ANTES que auth.js para que el
 * interceptor global de auth.js siga siendo el único que decide
 * qué hacer ante un 401; api.js solo normaliza URL y timeout.
 * Si se cargara después, auth.js no podría envolver a api.js.
 *
 * Uso:
 *   const datos = await apiFetch("/bode/mostrar");
 *   const datos = await apiFetch("/user/mostrar", { method: "POST", body: datos });
 *
 * Para URL absoluta (caso raro, sirve para salir del backend):
 *   apiFetch("https://otro-servidor/x")
 * ============================================================ */

(function () {
    "use strict";

    // ------------------------------------------------------------
    // URL base
    // ------------------------------------------------------------
    // El partial head.ejs inyecta window.__BACKEND_URL__ desde el
    // .env del servidor. El fallback cubre el caso de que falte.
    var BASE = String(
        typeof window.__BACKEND_URL__ === "string" && window.__BACKEND_URL__
            ? window.__BACKEND_URL__
            : "http://192.168.1.13:4000"
    ).replace(/\/+$/, "");

    var DEFAULT_TIMEOUT_MS = 15000;

    /**
     * Normaliza una ruta a URL absoluta del backend.
     * Acepta "/bode/mostrar", "bode/mostrar" o una URL completa.
     */
    function construirUrl(ruta) {
        if (/^https?:\/\//i.test(ruta)) return ruta;
        return BASE + (ruta.charAt(0) === "/" ? ruta : "/" + ruta);
    }

    function aError(mensaje, estado, cuerpo) {
        var err = new Error(mensaje);
        err.status = estado || 0;
        err.cuerpo = cuerpo;
        return err;
    }

    /**
     * Extrae un mensaje legible del cuerpo de error del backend.
     * El backend responde con {error, status, message} (ver
     * messages/browser.js) pero algunos endpoints devuelven texto
     * plano, así que se contemplan las tres formas.
     */
    function leerMensaje(cuerpo, estado) {
        if (!cuerpo) return "Error " + estado;

        if (typeof cuerpo === "string" && cuerpo.trim()) return cuerpo.trim();

        if (typeof cuerpo === "object") {
            if (cuerpo.error) return cuerpo.error;
            if (cuerpo.message) return cuerpo.message;
            if (Array.isArray(cuerpo.errores) && cuerpo.errores.length) {
                return cuerpo.errores.join("; ");
            }
        }

        return "Error " + estado;
    }

    async function leerCuerpo(respuesta) {
        var tipo = respuesta.headers.get("content-type") || "";

        try {
            if (tipo.indexOf("application/json") !== -1) {
                return await respuesta.json();
            }

            var texto = await respuesta.text();
            return texto || null;
        } catch (error) {
            // Cuerpo ilegible no debe tumbar la llamada.
            return null;
        }
    }

    /**
     * Fetch con URL base del backend y timeout por AbortController.
     *
     * NO gestiona el 401: de eso se encarga el interceptor global de
     * auth.js, para no duplicar la lógica de cierre de sesión.
     *
     * @param {string} ruta  Ruta del backend, p.ej. "/bode/mostrar".
     * @param {object} opciones  { method, headers, body, timeout, signal,
     *                            exponerRespuesta }
     * @returns {Promise<object|string|null>} Cuerpo parseado.
     *   Si `opciones.exponerRespuesta` es true, devuelve en su lugar
     *   { cuerpo, respuesta } para poder leer cabeceras como
     *   X-Total-Count. El resto de llamadas no se ven afectadas.
     * @throws {Error} Con err.status y err.cuerpo si la respuesta no es ok.
     */
    window.apiFetch = async function (ruta, opciones) {
        opciones = opciones || {};

        var url = construirUrl(ruta);

        // timeout propio, compatible con un AbortSignal externo.
        var controlador = new AbortController();
        var temporizador = null;
        var externo = null;
        var alAbortarExterno = null;

        if (opciones.signal) {
            if (opciones.signal.aborted) {
                controlador.abort();
            } else {
                alAbortarExterno = function () {
                    controlador.abort();
                };
                opciones.signal.addEventListener("abort", alAbortarExterno);
                externo = opciones.signal;
            }
        }

        var limite = opciones.timeout || DEFAULT_TIMEOUT_MS;

        if (limite > 0) {
            temporizador = setTimeout(function () {
                controlador.abort();
            }, limite);
        }

        var config = {
            method: opciones.method || "GET",
            headers: new Headers(opciones.headers || {}),
            signal: controlador.signal,
        };

        // El body se pasa tal cual. fetch() NO serializa objetos: el
        // cuerpo debe ser texto, FormData, Blob o un flujo, así que
        // quien llama hace JSON.stringify() explícito. No se serializa
        // aquí a propósito: hacerlo en silencio convertiría un fallo de
        // programación en un "[object Object]" aceptado por el backend.
        if (opciones.body !== undefined && opciones.body !== null) {
            config.body = opciones.body;
        }

        // Suelta el listener externo pase lo que pase: si no, se acumula
        // en cada llamada y sobrevive al timeout.
        function soltarExterno() {
            if (temporizador) {
                clearTimeout(temporizador);
                temporizador = null;
            }
            if (externo && alAbortarExterno) {
                externo.removeEventListener("abort", alAbortarExterno);
                externo = null;
                alAbortarExterno = null;
            }
        }

        var respuesta;

        try {
            respuesta = await fetch(url, config);
        } catch (error) {
            soltarExterno();

            if (error.name === "AbortError") {
                throw aError("La petición tardó demasiado. Intenta de nuevo.", 0, null);
            }

            throw aError("No se pudo conectar con el servidor.", 0, null);
        }

        soltarExterno();

        var cuerpo = await leerCuerpo(respuesta);

        if (!respuesta.ok) {
            throw aError(leerMensaje(cuerpo, respuesta.status), respuesta.status, cuerpo);
        }

        if (opciones.exponerRespuesta) {
            return { cuerpo: cuerpo, respuesta: respuesta };
        }

        return cuerpo;
    };

    // Expuesto para diagnóstico en consola.
    window.__API_BASE__ = BASE;
})();
