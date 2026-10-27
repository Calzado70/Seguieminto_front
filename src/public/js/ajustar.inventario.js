/* ============================================================
 * ajustar.inventario.js — Toma física / Ajuste de inventario
 *
 * Flujo:
 *   1. Se elige la bodega y se carga su inventario del sistema.
 *   2. El usuario escribe la cantidad contada en físico por producto.
 *   3. Se muestra la diferencia (físico - sistema) en vivo.
 *   4. Se elige un motivo y se aplican solo las diferencias.
 *   5. El backend lo hace en una sola transacción (todo o nada).
 * ============================================================ */

(function () {
  "use strict";

  var estado = {
    bodegas: [],
    filas: [],
    aplicando: false,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(valor) {
    if (typeof window.escapeHtml === "function") return window.escapeHtml(valor);
    return String(valor === undefined || valor === null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function avisar(mensaje, tipo) {
    if (typeof window.toast === "function") {
      window.toast(mensaje, tipo || "info");
    } else {
      console.log(mensaje);
    }
  }

  function aEntero(valor) {
    if (valor === "" || valor === null || valor === undefined) return null;
    var texto = String(valor).trim();
    if (!/^\d+$/.test(texto)) return null;
    return parseInt(texto, 10);
  }

  function configurarNavegacion() {
    ["adminUsuario", "bodegas", "historial", "productos"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", function () {
        if (el.value) window.location.href = el.value;
      });
    });
  }

  // -----------------------------------------------------------------------
  // Bodegas
  // -----------------------------------------------------------------------

  async function cargarBodegas() {
    try {
      var respuesta = await apiFetch("/bode/mostrar");
      var lista = (respuesta && respuesta.data) || (respuesta && respuesta.body) || [];
      estado.bodegas = Array.isArray(lista) ? lista : [];

      var select = $("bodegaAjuste");
      if (!select) return;

      estado.bodegas.forEach(function (b) {
        var opt = document.createElement("option");
        opt.value = b.id_bodega;
        opt.textContent = b.nombre;
        select.appendChild(opt);
      });
    } catch (e) {
      avisar("No se pudieron cargar las bodegas: " + e.message, "error");
    }
  }

  function nombreBodega(id) {
    var b = estado.bodegas.find(function (x) {
      return String(x.id_bodega) === String(id);
    });
    return b ? b.nombre : "";
  }

  // -----------------------------------------------------------------------
  // Inventario de la bodega
  // -----------------------------------------------------------------------

  function mostrarCargando() {
    var tabla = $("tablaAjuste");
    var empty = $("empty-state");
    if (tabla) tabla.style.display = "none";
    if (empty) {
      empty.style.display = "flex";
      empty.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Cargando...</p>';
    }
  }

  function mostrarVacio(mensaje) {
    var empty = $("empty-state");
    if (empty) {
      empty.style.display = "flex";
      empty.innerHTML = '<i class="fas fa-box-open"></i><p>' + esc(mensaje) + "</p>";
    }
    actualizarResumen();
  }

  async function cargarInventario() {
    var id = $("bodegaAjuste").value;
    if (!id) {
      avisar("Seleccione una bodega", "warning");
      return;
    }

    var nombre = nombreBodega(id);
    estado.filas = [];
    mostrarCargando();

    try {
      var respuesta = await apiFetch(
        "/product/inventario?nombre_bodega=" + encodeURIComponent(nombre),
      );
      var filas = (respuesta && respuesta.body) || respuesta || [];

      // Nos quedamos solo con las filas de la bodega elegida.
      estado.filas = filas.filter(function (f) {
        return String(f.id_bodega) === String(id);
      });

      if (!estado.filas.length) {
        mostrarVacio("Esta bodega no tiene inventario registrado");
        return;
      }

      render();
    } catch (e) {
      mostrarVacio("Esta bodega no tiene inventario registrado");
    }
  }

  function render() {
    var tabla = $("tablaAjuste");
    var empty = $("empty-state");
    var tbody = tabla ? tabla.querySelector("tbody") : null;
    if (!tabla || !tbody) return;

    var html = estado.filas
      .map(function (f) {
        return (
          '<tr data-id-producto="' + esc(f.id_producto) + '"' +
          ' data-codigo="' + esc(f.codigo) + '"' +
          ' data-sistema="' + esc(f.cantidad_disponible) + '">' +
          "<td>" + esc(f.codigo) + "</td>" +
          "<td>" + esc(f.caracteristica || "-") + "</td>" +
          '<td class="num">' + esc(f.cantidad_disponible) + "</td>" +
          '<td class="num"><input type="number" min="0" step="1" class="input-fisico" /></td>' +
          '<td class="num celda-diff">-</td>' +
          "</tr>"
        );
      })
      .join("");

    tbody.innerHTML = html;

    tabla.style.display = "table";
    if (empty) empty.style.display = "none";

    tbody.querySelectorAll(".input-fisico").forEach(function (input) {
      input.addEventListener("input", function () {
        recalcularFila(input.closest("tr"));
      });
    });

    actualizarResumen();
  }

  function recalcularFila(fila) {
    if (!fila) return;

    var sistema = Number(fila.dataset.sistema) || 0;
    var input = fila.querySelector(".input-fisico");
    var celda = fila.querySelector(".celda-diff");
    if (!input || !celda) return;

    var fisico = aEntero(input.value);

    celda.classList.remove("diff-pos", "diff-neg", "diff-cero");
    fila.dataset.diferencia = "";

    if (fisico === null) {
      celda.textContent = "-";
    } else {
      var diff = fisico - sistema;
      fila.dataset.diferencia = String(diff);
      celda.textContent = diff > 0 ? "+" + diff : String(diff);
      celda.classList.add(diff > 0 ? "diff-pos" : diff < 0 ? "diff-neg" : "diff-cero");
    }

    actualizarResumen();
  }

  function filasConDiferencia() {
    var filas = document.querySelectorAll("#tablaAjuste tbody tr");
    var resultado = [];

    filas.forEach(function (fila) {
      var diff = fila.dataset.diferencia;
      var input = fila.querySelector(".input-fisico");
      if (!input || input.value.trim() === "") return;
      if (diff === "" || diff === undefined) return;
      if (Number(diff) === 0) return;

      resultado.push({
        id_producto: Number(fila.dataset.idProducto),
        codigo: fila.dataset.codigo,
        cantidad_fisica: aEntero(input.value),
      });
    });

    return resultado;
  }

  function actualizarResumen() {
    var total = filasConDiferencia().length;
    var motivo = $("motivoAjuste") ? $("motivoAjuste").value.trim() : "";
    var resumen = $("resumenAjuste");
    var boton = $("btnAplicarAjuste");

    if (resumen) {
      resumen.textContent =
        total > 0
          ? total + " producto(s) con diferencia por ajustar"
          : "Sin diferencias por ajustar";
    }

    if (boton) {
      boton.disabled = estado.aplicando || total === 0 || !motivo;
    }
  }

  // -----------------------------------------------------------------------
  // Aplicar
  // -----------------------------------------------------------------------

  async function aplicarAjustes() {
    if (estado.aplicando) return;

    var idBodega = Number($("bodegaAjuste").value);
    var motivo = $("motivoAjuste").value.trim();
    var ajustes = filasConDiferencia();

    if (!idBodega) return avisar("Seleccione una bodega", "warning");
    if (!motivo) return avisar("El motivo del ajuste es obligatorio", "warning");
    if (!ajustes.length) return avisar("No hay diferencias por ajustar", "warning");

    var confirmado = true;
    if (typeof window.trostConfirmar === "function") {
      confirmado = await window.trostConfirmar(
        "Se ajustarán " + ajustes.length + " producto(s) en " +
          nombreBodega(idBodega) + ". Esta acción no se puede deshacer. ¿Continuar?",
        { titulo: "Confirmar ajuste de inventario", textoConfirmar: "Aplicar", peligro: true },
      );
    }
    if (!confirmado) return;

    estado.aplicando = true;
    var boton = $("btnAplicarAjuste");
    if (boton) boton.disabled = true;

    try {
      var respuesta = await apiFetch("/product/ajustar-lote", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
        body: JSON.stringify({ id_bodega: idBodega, motivo: motivo, ajustes: ajustes }),
      });

      var resultado = (respuesta && respuesta.body) || respuesta;
      var aplicadas = resultado && resultado.ajustadas;

      avisar(
        "Ajuste aplicado: " + (aplicadas !== undefined ? aplicadas : ajustes.length) +
          " producto(s) con diferencia.",
        "success",
      );

      var motivoEl = $("motivoAjuste");
      if (motivoEl) motivoEl.value = "";
      await cargarInventario();
    } catch (e) {
      avisar("No se pudo aplicar el ajuste: " + e.message, "error");
    } finally {
      estado.aplicando = false;
      actualizarResumen();
    }
  }

  // -----------------------------------------------------------------------
  // Arranque
  // -----------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.verificarTokenAlCargar === "function") {
      window.verificarTokenAlCargar();
    }

    configurarNavegacion();
    cargarBodegas();

    var btnCargar = $("btnCargar");
    if (btnCargar) btnCargar.addEventListener("click", cargarInventario);

    var select = $("bodegaAjuste");
    if (select) {
      select.addEventListener("change", function () {
        if (select.value) cargarInventario();
      });
    }

    var motivo = $("motivoAjuste");
    if (motivo) motivo.addEventListener("input", actualizarResumen);

    var btnAplicar = $("btnAplicarAjuste");
    if (btnAplicar) btnAplicar.addEventListener("click", aplicarAjustes);

    actualizarResumen();
  });
})();
