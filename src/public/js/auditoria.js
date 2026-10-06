// Auditoría de cambios (Fase 4.3).
// Paginación en el servidor: no se pide el total de filas entero, solo la
// página actual y el recuento que devuelve `X-Total-Count`.
(function () {
    "use strict";

    var LIMITE = 10;
    var RUTA = "/hist/auditoria";

    var estado = {
        pagina: 1,
        total: 0,
        filas: [],
        cargada: false,
        cargando: false
    };

    // Valores semilla para los desplegables; cualquier valor nuevo que
    // aparezca al paginar se añade a la lista (tabla abierta a futuro).
    var TABLAS_SEMILLA = ["caracteristicas", "catalogo_productos"];
    var ACCIONES_SEMILLA = ["CREAR", "MODIFICAR", "ELIMINAR", "CAMBIAR_ESTADO",
        "CREACION_INVENTARIO", "ACTUALIZACION_INVENTARIO"];

    function $(id) {
        return document.getElementById(id);
    }

    function pestañaActiva() {
        return $("tabAuditoria") && $("tabAuditoria").classList.contains("is-active");
    }

    function textoSeguro(valor, vacio) {
        if (valor === null || valor === undefined || valor === "") {
            return vacio || "-";
        }
        return escapeHtml(String(valor));
    }

    function recortar(valor, max) {
        valor = String(valor);
        return valor.length > max ? valor.slice(0, max - 1) + "…" : valor;
    }

    function obtenerFiltros() {
        var filtros = {};
        var mapa = {
            tabla: "auditTabla",
            accion: "auditAccion",
            usuario: "auditUsuario",
            fecha_desde: "auditDesde",
            fecha_hasta: "auditHasta"
        };

        Object.keys(mapa).forEach(function (clave) {
            var campo = $(mapa[clave]);
            var valor = campo ? String(campo.value || "").trim() : "";
            if (valor) filtros[clave] = valor;
        });

        return filtros;
    }

    function sumarOpciones(select, valores) {
        if (!select) return;

        valores.forEach(function (valor) {
            if (!valor) return;
            var existe = Array.prototype.some.call(
                select.options,
                function (opcion) { return opcion.value === valor; }
            );
            if (!existe) {
                var opcion = document.createElement("option");
                opcion.value = valor;
                opcion.textContent = valor;
                select.appendChild(opcion);
            }
        });
    }

    function actualizarSelectsConFilas(filas) {
        sumarOpciones($("auditTabla"), filas.map(function (f) { return f.tabla; }));
        sumarOpciones($("auditAccion"), filas.map(function (f) { return f.accion; }));
    }

    function detalleDe(fila) {
        var antes = fila.datos_antes;
        var despues = fila.datos_despues;

        if (!antes && !despues) return "-";

        var texto = "";
        if (antes) texto += "antes: " + antes;
        if (antes && despues) texto += " → ";
        if (despues) texto += "después: " + despues;

        return '<span class="audit-detalle" title="' +
            escapeHtml(texto) + '">' + escapeHtml(recortar(texto, 70)) + "</span>";
    }

    function pintar() {
        var contenedor = $("auditoriaRows");
        if (!contenedor) return;

        contenedor.innerHTML = "";

        if (estado.filas.length === 0) {
            var vacio = document.createElement("div");
            vacio.className = "no-results";
            vacio.textContent = "No se encontraron registros de auditoría.";
            contenedor.appendChild(vacio);
            return;
        }

        estado.filas.forEach(function (fila) {
            var filaEl = document.createElement("div");
            filaEl.className = "table-row";
            filaEl.innerHTML = [
                '<div class="table-cell">' +
                    escapeHtml(fila.fecha
                        ? new Date(fila.fecha).toLocaleString()
                        : "-") + "</div>",
                '<div class="table-cell">' + textoSeguro(fila.tabla) + "</div>",
                '<div class="table-cell">' +
                    '<span class="audit-accion audit-accion--' +
                    escapeHtml(String(fila.accion || "").toLowerCase()) + '">' +
                    textoSeguro(fila.accion) + "</span></div>",
                '<div class="table-cell">' + textoSeguro(fila.usuario) + "</div>",
                '<div class="table-cell audit-ip">' + textoSeguro(fila.ip) + "</div>",
                '<div class="table-cell audit-detalle-celda">' + detalleDe(fila) + "</div>"
            ].join("");
            contenedor.appendChild(filaEl);
        });
    }

    function pintarPaginacion() {
        var contenedor = $("auditoriaContainer");
        if (!contenedor) return;

        var viejo = contenedor.querySelector(".pagination-controls");
        if (viejo) viejo.remove();

        var totalPaginas = Math.max(1, Math.ceil(estado.total / LIMITE));
        var primero = estado.total === 0 ? 0 : (estado.pagina - 1) * LIMITE + 1;
        var ultimo = Math.min(estado.pagina * LIMITE, estado.total);

        var controles = document.createElement("div");
        controles.className = "pagination-controls";
        controles.innerHTML = [
            '<div class="pagination-info">',
            "Mostrando " + primero + "-" + ultimo + " de " + estado.total + " registros",
            "</div>",
            '<div class="pagination-buttons">',
            '<button class="pagination-button" data-pagina="1"',
                estado.pagina === 1 ? " disabled" : "",
                '><i class="fas fa-angle-double-left"></i></button>',
            '<button class="pagination-button" data-pagina="' + (estado.pagina - 1) + '"',
                estado.pagina === 1 ? " disabled" : "",
                '><i class="fas fa-angle-left"></i></button>',
            '<span class="current-page">Página ' + estado.pagina + " de " +
                totalPaginas + "</span>",
            '<button class="pagination-button" data-pagina="' + (estado.pagina + 1) + '"',
                estado.pagina >= totalPaginas ? " disabled" : "",
                '><i class="fas fa-angle-right"></i></button>',
            '<button class="pagination-button" data-pagina="' + totalPaginas + '"',
                estado.pagina >= totalPaginas ? " disabled" : "",
                '><i class="fas fa-angle-double-right"></i></button>',
            "</div>"
        ].join("");

        contenedor.appendChild(controles);

        Array.prototype.forEach.call(
            controles.querySelectorAll(".pagination-button"),
            function (boton) {
                boton.addEventListener("click", function () {
                    var destino = Number(boton.getAttribute("data-pagina"));
                    if (destino >= 1 && destino <= totalPaginas && destino !== estado.pagina) {
                        estado.pagina = destino;
                        cargar();
                    }
                });
            }
        );
    }

    function marcarCargando(cargando) {
        var contenedor = $("auditoriaRows");
        if (!contenedor || !cargando) return;

        var aviso = document.createElement("div");
        aviso.className = "no-results";
        aviso.id = "auditCargando";
        aviso.textContent = "Cargando auditoría…";

        var previo = $("auditCargando");
        if (previo) previo.remove();
        contenedor.appendChild(aviso);
    }

    async function cargar() {
        if (estado.cargando) return;

        estado.cargando = true;
        marcarCargando(true);

        try {
            var filtros = obtenerFiltros();
            filtros.page = estado.pagina;
            filtros.limit = LIMITE;

            var consulta = Object.keys(filtros).map(function (clave) {
                return encodeURIComponent(clave) + "=" +
                    encodeURIComponent(filtros[clave]);
            }).join("&");

            var res = await apiFetch(RUTA + "?" + consulta, {
                method: "GET",
                exponerRespuesta: true
            });

            var cuerpo = res.cuerpo;
            var filas = (cuerpo && cuerpo.body && Array.isArray(cuerpo.body))
                ? cuerpo.body
                : [];

            var cabecera = res.respuesta.headers.get("x-total-count");
            estado.total = cabecera === null ? filas.length : Number(cabecera);
            estado.filas = filas;
            estado.cargada = true;

            // Si la página quedó fuera de rango (al filtrar), retrocede.
            var totalPaginas = Math.max(1, Math.ceil(estado.total / LIMITE));
            if (estado.pagina > totalPaginas && estado.pagina > 1) {
                estado.pagina = totalPaginas;
                estado.cargando = false;
                return cargar();
            }

            actualizarSelectsConFilas(filas);
            pintar();
            pintarPaginacion();
        } catch (error) {
            console.error("Error al cargar la auditoría:", error.message);
            toast(
                "No se pudo cargar la auditoría. Detalle: " + error.message,
                "error"
            );
        } finally {
            estado.cargando = false;
        }
    }

    function recargarDesdeInicio() {
        estado.pagina = 1;
        cargar();
    }

    function conectarFiltros() {
        var conRetardo = ["auditUsuario", "auditDesde", "auditHasta"];
        var temporizador = null;

        conRetardo.forEach(function (id) {
            var campo = $(id);
            if (!campo) return;
            campo.addEventListener("input", function () {
                clearTimeout(temporizador);
                temporizador = setTimeout(recargarDesdeInicio, 300);
            });
        });

        ["auditTabla", "auditAccion"].forEach(function (id) {
            var campo = $(id);
            if (!campo) return;
            campo.addEventListener("change", recargarDesdeInicio);
        });

        var limpiar = $("auditLimpiar");
        if (limpiar) {
            limpiar.addEventListener("click", function () {
                ["auditTabla", "auditAccion", "auditUsuario", "auditDesde",
                    "auditHasta"].forEach(function (id) {
                    var campo = $(id);
                    if (campo) campo.value = "";
                });
                recargarDesdeInicio();
            });
        }
    }

    function cambiarPestana(auditoria) {
        var tabMov = $("tabMovimientos");
        var tabAud = $("tabAuditoria");
        var panelMov = $("panelMovimientos");
        var panelAud = $("panelAuditoria");
        if (!tabMov || !tabAud || !panelMov || !panelAud) return;

        tabMov.classList.toggle("is-active", !auditoria);
        tabAud.classList.toggle("is-active", auditoria);
        tabMov.setAttribute("aria-selected", String(!auditoria));
        tabAud.setAttribute("aria-selected", String(auditoria));
        panelMov.hidden = auditoria;
        panelAud.hidden = !auditoria;

        if (auditoria && !estado.cargada) {
            cargar();
        }
    }

    // Exporta la pestaña que esté visible; si es la de auditoría se
    // encarga este módulo y si no devuelve false para que siga el de
    // movimientos (historial.js).
    window.exportarAuditoriaSiActiva = function () {
        if (!pestañaActiva()) return false;

        if (estado.filas.length === 0) {
            toast("No hay datos de auditoría para exportar", "warning");
            return true;
        }

        var datos = [[
            "Fecha", "Tabla", "Acción", "Usuario", "ID Usuario", "IP", "Detalle"
        ]];

        estado.filas.forEach(function (fila) {
            datos.push([
                fila.fecha ? new Date(fila.fecha).toLocaleString() : "-",
                fila.tabla || "",
                fila.accion || "",
                fila.usuario || "",
                fila.id_usuario !== null && fila.id_usuario !== undefined
                    ? fila.id_usuario : "",
                fila.ip || "",
                [fila.datos_antes ? "antes: " + fila.datos_antes : "",
                    fila.datos_despues ? "después: " + fila.datos_despues : ""]
                    .filter(Boolean).join(" → ")
            ]);
        });

        exportarXlsx({
            filas: datos,
            tipo: "aoa",
            hoja: "Auditoria",
            archivo: "Auditoria_" + new Date().toISOString().split("T")[0] + ".xlsx"
        }).catch(function (error) {
            toast(error.message, "error");
        });

        return true;
    };

    document.addEventListener("DOMContentLoaded", function () {
        var tabMov = $("tabMovimientos");
        var tabAud = $("tabAuditoria");
        if (!tabMov || !tabAud) return;

        tabMov.addEventListener("click", function () { cambiarPestana(false); });
        tabAud.addEventListener("click", function () { cambiarPestana(true); });

        conectarFiltros();
    });
})();
