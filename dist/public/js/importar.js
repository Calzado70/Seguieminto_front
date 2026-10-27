/* ============================================================
 * importar.js — Carga masiva de datos (Fase 5)
 *
 * Flujo:
 *   1. Se elige el tipo (productos, saldos, transferencias, consumos).
 *   2. Se descarga la plantilla o se sube un .xlsx / .csv.
 *   3. El archivo se parsea en el navegador con SheetJS y se envía al
 *      backend para validar (confirmar:false).
 *   4. Si hay errores, no se aplica nada y se listan con fila, columna,
 *      tipo y mensaje. Si todo es válido, se habilita "Aplicar carga".
 *   5. Al aplicar (confirmar:true), el backend lo hace en una sola
 *      transacción: todo o nada.
 * ============================================================ */

(function () {
  "use strict";

  var estado = {
    catalogos: null,
    tipo: null,
    filas: [],
    archivo: null,
    valido: false,
    ocupado: false,
  };

  var EJEMPLOS = {
    productos: [{ codigo: "CI0001", caracteristica: "Ejemplo" }],
    saldos: [
      { codigo: "CI0001", bodega: "Nombre de bodega", cantidad: 100, motivo: "Carga inicial" },
    ],
    transferencias: [
      {
        codigo: "CI0001",
        bodega_origen: "Bodega origen",
        bodega_destino: "Bodega destino",
        cantidad: 10,
        tipo_movimiento: "ENTRADA",
        observaciones: "",
      },
    ],
    consumos: [
      { codigo: "CI0001", destino: "logistica", cantidad: 10, observaciones: "" },
    ],
  };

  var AYUDAS = {
    productos: "Columnas: codigo, caracteristica. El código debe ser único.",
    saldos: "Columnas: codigo, bodega, cantidad, motivo (opcional). La cantidad es el saldo final de esa bodega.",
    transferencias:
      "Columnas: codigo, bodega_origen, bodega_destino, cantidad, tipo_movimiento (ENTRADA/PROCESO/COMPLETO), observaciones (opcional).",
    consumos:
      'Columnas: codigo, destino (logistica o terminada), cantidad, observaciones (opcional).',
  };

  // -----------------------------------------------------------------------
  // Utilidades
  // -----------------------------------------------------------------------

  function $(id) {
    return document.getElementById(id);
  }

  function normEncabezado(valor) {
    return String(valor ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function esc(valor) {
    if (typeof window.escapeHtml === "function") return window.escapeHtml(valor);
    return String(valor ?? "")
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
      console[mensaje && tipo === "error" ? "error" : "log"](mensaje);
    }
  }

  // Prefijo de la bodega (por id o nombre) según el catálogo del backend.
  function prefijoDeBodega(valor) {
    if (!estado.catalogos) return "";
    var prefijos = estado.catalogos.prefijos_bodega || {};
    var bodegas = estado.catalogos.bodegas || [];
    var texto = String(valor === undefined || valor === null ? "" : valor).trim();
    if (!texto) return "";

    var encontrada = bodegas.find(function (b) {
      return (
        String(b.id_bodega) === texto ||
        String(b.nombre || "").toLowerCase() === texto.toLowerCase()
      );
    });
    if (!encontrada) return "";

    // Un prefijo vacío es válido (bodegas 6 y 25: código inteligente sin
    // prefijo). Solo se cae a "PPG" cuando la bodega no está en el catálogo.
    if (Object.prototype.hasOwnProperty.call(prefijos, encontrada.id_bodega)) {
      return prefijos[encontrada.id_bodega];
    }
    return "PPG";
  }

  // Código inteligente = prefijo de bodega + código base. Para saldos usa la
  // bodega de la fila; para transferencias la bodega origen; para consumos la
  // bodega de origen del flujo (logística=25, terminada=6), igual que el backend.
  function codigoInteligente(fila) {
    var codigo = String(fila.codigo === undefined || fila.codigo === null ? "" : fila.codigo).trim();
    if (!codigo) return "";

    var prefijo = "";
    if (estado.tipo === "saldos") {
      prefijo = prefijoDeBodega(fila.bodega);
    } else if (estado.tipo === "transferencias") {
      prefijo = prefijoDeBodega(fila.bodega_origen);
    } else if (estado.tipo === "consumos") {
      var destino = String(fila.destino || "").trim().toLowerCase();
      prefijo = prefijoDeBodega(destino === "terminada" ? 6 : 25);
    }

    return prefijo ? prefijo + codigo : codigo;
  }

  function configurarNavegacion() {
    ["adminUsuario", "bodegas", "historial", "productos", "importarNav"].forEach(function (id) {
      var select = $(id);
      if (!select) return;
      select.addEventListener("change", function () {
        if (select.value) window.location.href = select.value;
      });
    });
  }

  // -----------------------------------------------------------------------
  // Catálogos y selector de tipo
  // -----------------------------------------------------------------------

  async function cargarCatalogos() {
    try {
      var respuesta = await apiFetch("/import/catalogos", { method: "GET" });
      estado.catalogos = respuesta && respuesta.body ? respuesta.body : respuesta;
      renderTipoSelector();
    } catch (e) {
      avisar("No se pudieron cargar los catálogos: " + e.message, "error");
    }
  }

  function renderTipoSelector() {
    var contenedor = $("tipoSelector");
    if (!contenedor || !estado.catalogos) return;

    var tipos = estado.catalogos.tipos || [];
    contenedor.innerHTML = "";

    tipos.forEach(function (t) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "tipo-opcion";
      boton.dataset.tipo = t.valor;
      boton.innerHTML =
        "<strong>" + esc(t.etiqueta) + "</strong>" +
        "<small>" + esc(AYUDAS[t.valor] || "") + "</small>";

      boton.addEventListener("click", function () {
        seleccionarTipo(t.valor);
      });

      contenedor.appendChild(boton);
    });

    // Preselección del primero.
    if (tipos.length) seleccionarTipo(tipos[0].valor);
  }

  function seleccionarTipo(tipo) {
    estado.tipo = tipo;
    estado.filas = [];
    estado.archivo = null;
    estado.valido = false;

    var botones = document.querySelectorAll(".tipo-opcion");
    botones.forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.tipo === tipo);
    });

    var ayuda = $("columnasAyuda");
    if (ayuda) ayuda.textContent = AYUDAS[tipo] || "";

    var nombre = $("archivoNombre");
    if (nombre) nombre.textContent = "Ningún archivo seleccionado";

    var input = $("inputArchivo");
    if (input) input.value = "";

    var limpiar = $("btnLimpiar");
    if (limpiar) limpiar.hidden = true;

    ocultarPaso3();
  }

  // -----------------------------------------------------------------------
  // Plantilla
  // -----------------------------------------------------------------------

  async function descargarPlantilla() {
    if (!estado.tipo || !estado.catalogos) return;

    var columnas = (estado.catalogos.columnas[estado.tipo] || []).map(function (c) {
      return c.nombre;
    });

    var ejemplos = (EJEMPLOS[estado.tipo] || []).map(function (fila) {
      return columnas.map(function (col) {
        return fila[col] !== undefined ? fila[col] : "";
      });
    });

    try {
      await exportarXlsx({
        filas: [columnas].concat(ejemplos),
        tipo: "aoa",
        hoja: "Datos",
        archivo: "Plantilla_" + estado.tipo + ".xlsx",
        anchos: columnas.map(function () {
          return 22;
        }),
      });
      avisar("Plantilla descargada", "success");
    } catch (e) {
      avisar("No se pudo generar la plantilla: " + e.message, "error");
    }
  }

  // -----------------------------------------------------------------------
  // Lectura del archivo
  // -----------------------------------------------------------------------

  async function leerArchivo(file) {
    if (!file) return;

    estado.archivo = file;
    estado.filas = [];
    estado.valido = false;

    var nombre = $("archivoNombre");
    if (nombre) nombre.textContent = file.name;

    var limpiar = $("btnLimpiar");
    if (limpiar) limpiar.hidden = false;

    try {
      await cargarLibreriaXlsx();

      var datos;
      if (/\.csv$/i.test(file.name)) {
        datos = await file.text();

        // Excel en español suele exportar CSV con ';'. Si la cabecera tiene
        // más punto y coma que comas, se fuerza ese separador.
        var primeraLinea = datos.split(/\r?\n/)[0] || "";
        var separador =
          primeraLinea.split(";").length > primeraLinea.split(",").length ? ";" : ",";

        var wbTexto = XLSX.read(datos, { type: "string", FS: separador });
        procesarLibro(wbTexto);
      } else {
        var buffer = await file.arrayBuffer();
        var wb = XLSX.read(buffer, { type: "array" });
        procesarLibro(wb);
      }
    } catch (e) {
      console.error(e);
      ocultarPaso3();
      avisar("No se pudo leer el archivo: " + e.message, "error");
    }
  }

  function procesarLibro(wb) {
    var hoja = wb.Sheets[wb.SheetNames[0]];
    if (!hoja) throw new Error("El archivo no tiene hojas.");

    var aoa = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "", blankrows: true });

    var headerIdx = aoa.findIndex(function (fila) {
      return Array.isArray(fila) && fila.some(function (v) {
        return String(v).trim() !== "";
      });
    });

    if (headerIdx < 0) throw new Error("El archivo está vacío.");

    var encabezados = aoa[headerIdx].map(normEncabezado);
    var columnasTipo = (estado.catalogos.columnas[estado.tipo] || []).map(function (c) {
      return c.nombre;
    });
    var validas = new Set(columnasTipo);

    var requeridas = (estado.catalogos.columnas[estado.tipo] || [])
      .filter(function (c) {
        return c.requerida;
      })
      .map(function (c) {
        return c.nombre;
      });

    var faltantes = requeridas.filter(function (col) {
      return encabezados.indexOf(col) === -1;
    });

    if (faltantes.length) {
      ocultarPaso3();
      throw new Error(
        "Faltan columnas obligatorias: " + faltantes.join(", ") +
        ". Descarga la plantilla para ver el formato exacto.",
      );
    }

    var filas = [];
    for (var i = headerIdx + 1; i < aoa.length; i++) {
      var arr = aoa[i];
      if (!Array.isArray(arr)) continue;

      var vacia = arr.every(function (v) {
        return String(v).trim() === "";
      });
      if (vacia) continue;

      var obj = { _fila: i + 1 };
      encabezados.forEach(function (enc, col) {
        if (validas.has(enc)) obj[enc] = arr[col];
      });
      filas.push(obj);
    }

    if (!filas.length) {
      ocultarPaso3();
      throw new Error("El archivo no contiene filas de datos.");
    }

    estado.filas = filas;
    validarFilas();
  }

  // -----------------------------------------------------------------------
  // Validación y previsualización
  // -----------------------------------------------------------------------

  async function validarFilas() {
    if (!estado.tipo || !estado.filas.length || estado.ocupado) return;

    estado.ocupado = true;
    estado.valido = false;
    actualizarBotonAplicar(false, "Validando...");

    try {
      var respuesta = await apiFetch("/import/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: estado.tipo,
          filas: estado.filas,
          confirmar: false,
        }),
      });

      var resultado = respuesta && respuesta.body ? respuesta.body : respuesta;

      // Liberar el bloqueo ANTES de pintar el resultado: actualizarBotonAplicar
      // consulta estado.ocupado, y con la validación en curso seguía en true,
      // por lo que el botón "Aplicar carga" quedaba deshabilitado aun estando
      // todo correcto.
      estado.ocupado = false;
      mostrarResultadoValidacion(resultado);
    } catch (e) {
      estado.ocupado = false;
      ocultarPaso3();
      avisar("No se pudo validar el archivo: " + e.message, "error");
    }
  }

  function mostrarResultadoValidacion(resultado) {
    var paso3 = $("paso3");
    if (paso3) paso3.hidden = false;

    var resumen = $("resumen");
    var total = resultado.resumen ? resultado.resumen.total : estado.filas.length;
    var validas = resultado.resumen ? resultado.resumen.validas : 0;
    var errores = resultado.errores || [];

    if (resumen) {
      resumen.hidden = false;
      resumen.innerHTML =
        '<span class="resumen-item">Filas: <strong>' + esc(total) + "</strong></span>" +
        '<span class="resumen-item ok">Válidas: <strong>' + esc(validas) + "</strong></span>" +
        '<span class="resumen-item' + (errores.length ? " err" : "") + '">Errores: <strong>' +
        esc(errores.length) + "</strong></span>";
    }

    if (errores.length) {
      mostrarErrores(errores);
      ocultarPreview();
      actualizarBotonAplicar(false, "Corrige los errores para continuar");
      estado.valido = false;
    } else {
      ocultarErrores();
      mostrarPreview();
      estado.valido = true;
      actualizarBotonAplicar(true, "Todo válido. Puedes aplicar la carga.");
    }
  }

  function mostrarErrores(errores) {
    var bloque = $("bloqueErrores");
    var cuerpo = $("erroresBody");
    var titulo = $("erroresTitulo");
    if (!bloque || !cuerpo) return;

    if (titulo) {
      titulo.textContent =
        "Se encontraron " + errores.length + " error(es). No se cargó ningún dato.";
    }

    cuerpo.innerHTML = errores
      .map(function (e) {
        return (
          "<tr>" +
          '<td class="fila">' + esc(e.fila) + "</td>" +
          '<td class="columna">' + esc(e.columna) + "</td>" +
          "<td>" + esc(e.tipo) + "</td>" +
          "<td>" + esc(e.mensaje) + "</td>" +
          "</tr>"
        );
      })
      .join("");

    bloque.hidden = false;
  }

  function ocultarErrores() {
    var bloque = $("bloqueErrores");
    if (bloque) bloque.hidden = true;
  }

  function mostrarPreview() {
    var columnas = (estado.catalogos.columnas[estado.tipo] || []).map(function (c) {
      return c.nombre;
    });

    var conCodigoInteligente = ["saldos", "transferencias", "consumos"].indexOf(
      estado.tipo,
    ) !== -1;

    var head = $("previewHead");
    var body = $("previewBody");
    var scroll = $("previewScroll");
    if (!head || !body || !scroll) return;

    head.innerHTML =
      "<tr>" +
      columnas
        .map(function (col) {
          return "<th>" + esc(col) + "</th>";
        })
        .join("") +
      (conCodigoInteligente ? '<th class="col-inteligente">Código inteligente</th>' : "") +
      "</tr>";

    var max = Math.min(estado.filas.length, 100);
    var html = "";
    for (var i = 0; i < max; i++) {
      var fila = estado.filas[i];
      html +=
        "<tr>" +
        columnas
          .map(function (col) {
            var valor = fila[col] !== undefined ? fila[col] : "";
            var numero = col === "cantidad";
            return '<td class="' + (numero ? "num" : "") + '">' + esc(valor) + "</td>";
          })
          .join("") +
        (conCodigoInteligente
          ? '<td class="col-inteligente"><strong>' + esc(codigoInteligente(fila)) + "</strong></td>"
          : "") +
        "</tr>";
    }
    body.innerHTML = html;
    scroll.hidden = false;

    if (estado.filas.length > max) {
      var aviso = document.createElement("p");
      aviso.className = "nota-aplicar";
      aviso.textContent =
        "Mostrando las primeras " + max + " de " + estado.filas.length + " filas.";
      var cont = $("accionesFinales");
      if (cont && !cont.querySelector(".nota-preview")) {
        aviso.classList.add("nota-preview");
        cont.parentNode.insertBefore(aviso, cont);
      }
    }

    var acciones = $("accionesFinales");
    if (acciones) acciones.hidden = false;
  }

  function ocultarPreview() {
    var scroll = $("previewScroll");
    if (scroll) scroll.hidden = true;
    var acciones = $("accionesFinales");
    if (acciones) acciones.hidden = false;
  }

  function ocultarPaso3() {
    var paso3 = $("paso3");
    if (paso3) paso3.hidden = true;
    ocultarErrores();
    var scroll = $("previewScroll");
    if (scroll) scroll.hidden = true;
    var resumen = $("resumen");
    if (resumen) resumen.hidden = true;
  }

  function actualizarBotonAplicar(habilitado, nota) {
    var boton = $("btnAplicar");
    if (boton) boton.disabled = !habilitado || estado.ocupado;

    var notaEl = $("notaAplicar");
    if (notaEl) {
      notaEl.textContent = nota || "";
      notaEl.classList.toggle("ok", habilitado);
    }
  }

  // -----------------------------------------------------------------------
  // Aplicar
  // -----------------------------------------------------------------------

  async function aplicarCarga() {
    if (!estado.valido || estado.ocupado) return;

    var confirmado = true;
    if (typeof window.trostConfirmar === "function") {
      confirmado = await window.trostConfirmar(
        "Se aplicarán " + estado.filas.length + " fila(s) de tipo " +
          estado.tipo + ". Esta acción no se puede deshacer. ¿Continuar?",
        { titulo: "Confirmar carga masiva", textoConfirmar: "Aplicar" },
      );
    }

    if (!confirmado) return;

    estado.ocupado = true;
    actualizarBotonAplicar(false, "Aplicando...");

    try {
      var respuesta = await apiFetch("/import/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
        body: JSON.stringify({
          tipo: estado.tipo,
          filas: estado.filas,
          confirmar: true,
        }),
      });

      var resultado = respuesta && respuesta.body ? respuesta.body : respuesta;

      if (resultado && resultado.aplicado) {
        avisar(
          "Carga aplicada correctamente: " + resultado.total + " fila(s).",
          "success",
        );
        limpiarArchivo();
      } else {
        mostrarResultadoValidacion(resultado || { errores: [] });
        avisar("No se aplicó la carga. Revisa los errores.", "error");
      }
    } catch (e) {
      avisar("No se pudo aplicar la carga: " + e.message, "error");
    } finally {
      estado.ocupado = false;
      actualizarBotonAplicar(estado.valido, estado.valido ? "Todo válido. Puedes aplicar la carga." : "");
    }
  }

  function limpiarArchivo() {
    estado.filas = [];
    estado.archivo = null;
    estado.valido = false;

    var input = $("inputArchivo");
    if (input) input.value = "";

    var nombre = $("archivoNombre");
    if (nombre) nombre.textContent = "Ningún archivo seleccionado";

    var limpiar = $("btnLimpiar");
    if (limpiar) limpiar.hidden = true;

    ocultarPaso3();
  }

  // -----------------------------------------------------------------------
  // Arranque
  // -----------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.verificarTokenAlCargar === "function") {
      window.verificarTokenAlCargar();
    }

    configurarNavegacion();

    var btnPlantilla = $("btnPlantilla");
    if (btnPlantilla) btnPlantilla.addEventListener("click", descargarPlantilla);

    var input = $("inputArchivo");
    if (input) {
      input.addEventListener("change", function () {
        if (input.files && input.files[0]) leerArchivo(input.files[0]);
      });
    }

    var btnLimpiar = $("btnLimpiar");
    if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarArchivo);

    var btnAplicar = $("btnAplicar");
    if (btnAplicar) btnAplicar.addEventListener("click", aplicarCarga);

    cargarCatalogos();
  });
})();
