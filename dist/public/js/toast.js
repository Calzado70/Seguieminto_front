/* ============================================================
   TROST — Notificaciones unificadas (Fase 3.4)
   Un solo sistema de toasts + diálogos accesibles.
   Reemplaza showToast(), mostrarToast(), mostrarMensaje(),
   Toastify y los alert()/confirm()/prompt() nativos.
   ============================================================ */
(function () {
    "use strict";

    var REGION_ID = "trost-toast-region";
    var MAX_VISIBLES = 4;
    var DURACION = 4000;

    function contenedor() {
        var region = document.getElementById(REGION_ID);

        if (!region) {
            region = document.createElement("div");
            region.id = REGION_ID;
            region.className = "toast-region";
            region.setAttribute("role", "status");
            region.setAttribute("aria-live", "polite");
            region.setAttribute("aria-atomic", "false");
            document.body.appendChild(region);
        }

        return region;
    }

    function estilos() {
        if (document.getElementById("trost-toast-css")) return;

        var style = document.createElement("style");
        style.id = "trost-toast-css";
        style.textContent = `
.toast-region {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border-left: 4px solid #13302e;
  background: #ffffff;
  color: #1f2933;
  font-family: "Corbel", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  box-shadow: 0 8px 24px rgba(19, 48, 46, 0.18);
  pointer-events: auto;
  animation: toast-in 0.22s ease;
}

.toast.is-saliendo {
  animation: toast-out 0.2s ease forwards;
}

.toast-icon {
  flex: 0 0 auto;
  font-size: 16px;
  line-height: 1.35;
}

.toast-texto {
  flex: 1 1 auto;
  word-break: break-word;
  white-space: pre-line;
}

.toast-cerrar {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}

.toast-cerrar:hover,
.toast-cerrar:focus-visible {
  color: #1f2933;
}

.toast-success { border-left-color: #2ed573; }
.toast-success .toast-icon { color: #2ed573; }

.toast-error { border-left-color: #ef4444; }
.toast-error .toast-icon { color: #ef4444; }

.toast-warning { border-left-color: #ff9f43; }
.toast-warning .toast-icon { color: #ff9f43; }

.toast-info { border-left-color: #2e86de; }
.toast-info .toast-icon { color: #2e86de; }

@keyframes toast-in {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes toast-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(24px); }
}

@media (max-width: 480px) {
  .toast-region {
    top: auto;
    bottom: 12px;
    left: 12px;
    right: 12px;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast, .toast.is-saliendo { animation: none; }
}

/* ---------- Diálogo de confirmación (reemplaza confirm) ---------- */
.trost-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(19, 48, 46, 0.55);
}

.trost-dialog {
  width: min(420px, 100%);
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
  font-family: "Corbel", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1f2933;
}

.trost-dialog h2 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
}

.trost-dialog p {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.55;
  color: #64748b;
  white-space: pre-line;
  word-break: break-word;
}

.trost-dialog-acciones {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.trost-dialog-acciones button {
  min-width: 96px;
  padding: 10px 16px;
  border: 0;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.trost-btn-cancelar {
  background: #eef2f1;
  color: #1f2933;
}

.trost-btn-confirmar {
  background: #13302e;
  color: #ffffff;
}

.trost-btn-confirmar.trost-btn-peligro {
  background: #ef4444;
}

.trost-dialog-acciones button:focus-visible {
  outline: 3px solid #e0ff00;
  outline-offset: 2px;
}

/* ---------- Diálogo de entrada (reemplaza prompt) ---------- */
.trost-dialog input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5d1;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  margin-bottom: 20px;
}

.trost-dialog input:focus-visible {
  outline: 3px solid rgba(224, 255, 0, 0.6);
  outline-offset: 1px;
  border-color: #13302e;
}
`;
        document.head.appendChild(style);
    }

    var ICONOS = {
        success: "fa-circle-check",
        error: "fa-circle-exclamation",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info",
    };

    function mostrarToast(mensaje, tipo) {
        estilos();

        if (!mensaje) return null;

        tipo = ICONOS[tipo] ? tipo : "info";

        var region = contenedor();

        while (region.children.length >= MAX_VISIBLES) {
            region.removeChild(region.firstElementChild);
        }

        var toast = document.createElement("div");
        toast.className = "toast toast-" + tipo;

        var icono = document.createElement("i");
        icono.className = "toast-icon fas " + (ICONOS[tipo] || ICONOS.info);
        icono.setAttribute("aria-hidden", "true");

        var texto = document.createElement("span");
        texto.className = "toast-texto";
        texto.textContent = String(mensaje);

        var cerrar = document.createElement("button");
        cerrar.className = "toast-cerrar";
        cerrar.type = "button";
        cerrar.setAttribute("aria-label", "Cerrar notificación");
        cerrar.innerHTML = "&times;";
        cerrar.addEventListener("click", function () {
            quitar();
        });

        function quitar() {
            toast.classList.add("is-saliendo");
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 200);
        }

        toast.appendChild(icono);
        toast.appendChild(texto);
        toast.appendChild(cerrar);
        region.appendChild(toast);

        var timer = setTimeout(quitar, DURACION);

        toast.addEventListener("mouseenter", function () {
            clearTimeout(timer);
        });
        toast.addEventListener("mouseleave", function () {
            timer = setTimeout(quitar, 1500);
        });

        return toast;
    }

    function dialogo(opciones) {
        estilos();

        return new Promise(function (resolve) {
            var backdrop = document.createElement("div");
            backdrop.className = "trost-dialog-backdrop";

            var dialog = document.createElement("div");
            dialog.className = "trost-dialog";
            dialog.setAttribute("role", "dialog");
            dialog.setAttribute("aria-modal", "true");

            var titulo = document.createElement("h2");
            titulo.textContent = opciones.titulo || "Confirmar";
            dialog.appendChild(titulo);

            if (opciones.mensaje) {
                var parrafo = document.createElement("p");
                parrafo.textContent = opciones.mensaje;
                dialog.appendChild(parrafo);
            }

            var input = null;

            if (opciones.input !== undefined) {
                input = document.createElement("input");
                input.type = "text";
                input.value = opciones.input || "";
                if (opciones.placeholder) input.placeholder = opciones.placeholder;
                input.setAttribute(
                    "aria-label",
                    opciones.titulo || "Valor"
                );
                dialog.appendChild(input);
            }

            var acciones = document.createElement("div");
            acciones.className = "trost-dialog-acciones";

            var btnCancelar = document.createElement("button");
            btnCancelar.type = "button";
            btnCancelar.className = "trost-btn-cancelar";
            btnCancelar.textContent = opciones.textoCancelar || "Cancelar";

            var btnConfirmar = document.createElement("button");
            btnConfirmar.type = "button";
            btnConfirmar.className =
                "trost-btn-confirmar" + (opciones.peligro ? " trost-btn-peligro" : "");
            btnConfirmar.textContent = opciones.textoConfirmar || "Confirmar";

            function cerrar(resultado) {
                document.removeEventListener("keydown", alPulsarTecla);
                if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
                resolve(resultado);
            }

            function alPulsarTecla(evento) {
                if (evento.key === "Escape") {
                    cerrar(input ? null : false);
                } else if (evento.key === "Enter" && input) {
                    cerrar(input.value);
                }
            }

            btnCancelar.addEventListener("click", function () {
                cerrar(input ? null : false);
            });

            btnConfirmar.addEventListener("click", function () {
                cerrar(input ? input.value : true);
            });

            backdrop.addEventListener("mousedown", function (evento) {
                if (evento.target === backdrop) cerrar(input ? null : false);
            });

            document.addEventListener("keydown", alPulsarTecla);

            acciones.appendChild(btnCancelar);
            acciones.appendChild(btnConfirmar);
            dialog.appendChild(acciones);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);

            if (input) {
                input.focus();
                input.select();
            } else {
                btnConfirmar.focus();
            }
        });
    }

    // ---------- API pública ----------
    window.toast = mostrarToast;
    window.trostConfirmar = function (mensaje, opciones) {
        var config = opciones || {};
        if (typeof config === "string") config = { mensaje: config };

        return dialogo({
            titulo: config.titulo || "Confirmar",
            mensaje: config.mensaje || mensaje,
            textoConfirmar: config.textoConfirmar || "Confirmar",
            textoCancelar: config.textoCancelar || "Cancelar",
            peligro: config.peligro,
        });
    };

    window.trostPedir = function (mensaje, opciones) {
        var config = opciones || {};
        if (typeof config === "string") config = { mensaje: config };

        return dialogo({
            titulo: config.titulo || "Ingresar valor",
            mensaje: config.mensaje || mensaje,
            placeholder: config.placeholder,
            input: config.input !== undefined ? config.input : "",
            textoConfirmar: config.textoConfirmar || "Guardar",
            textoCancelar: config.textoCancelar || "Cancelar",
        });
    };

    // ---------- Alias de compatibilidad ----------
    window.mostrarNotificacion = mostrarToast;
    window.mostrarToast = mostrarToast;
    window.showToast = mostrarToast;
    window.mostrarMensaje = function (mensaje, tipo) {
        return mostrarToast(mensaje, tipo === true ? "success" : tipo);
    };
})();
