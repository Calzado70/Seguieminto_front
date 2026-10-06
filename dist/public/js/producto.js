/* =========================
   VARIABLES GLOBALES
========================= */
let productos = {};
let totalUnidades = 0;

/* =========================
   CARACTERÍSTICAS VÁLIDAS
   (cargadas desde la base de datos)
========================= */
let CARACTERISTICAS_VALIDAS = [];

async function cargarCaracteristicas() {
  try {
    const data = await apiFetch("/caracter/listar?soloActivas=true");
    CARACTERISTICAS_VALIDAS = (data.body || []).map((c) => c.valor);
  } catch (err) {
    console.error("Error al cargar características:", err);
    CARACTERISTICAS_VALIDAS = [];
  }
}
/* =========================
   BODEGAS DE TERMINADA
========================= */
function esBodegaTerminada(idBodega) {
  return [6, 24, 25].includes(Number(idBodega));
}

async function resolverProductoTerminada(codigo) {
  try {
    const data = await apiFetch(
      `/product/consumo-terminada-proceso?codigo_barras=${encodeURIComponent(codigo)}`,
    );
    return data.body;
  } catch (err) {
    console.error("Error resolviendo producto terminada:", err);
    return null;
  }
}

/* =========================
   PERSISTENCIA LOCAL
========================= */
function guardarListaEnLocalStorage() {
  localStorage.setItem("productos_transferencia", JSON.stringify(productos));
  localStorage.setItem("total_unidades_transferencia", totalUnidades);
}

function restaurarListaDesdeLocalStorage() {
  const productosGuardados = localStorage.getItem("productos_transferencia");
  const totalGuardado = localStorage.getItem("total_unidades_transferencia");

  if (!productosGuardados) return;

  productos = JSON.parse(productosGuardados);
  totalUnidades = parseInt(totalGuardado) || 0;

  Object.keys(productos).forEach((clave) => {
    crearFilaProducto(clave, productos[clave]);
  });

  actualizarEstadisticas();
}

function restaurarDatosFormulario() {
  const bodegaGuardada = localStorage.getItem("bodega_destino_id");
  const tipoMovimientoGuardado = localStorage.getItem(
    "tipo_movimiento_guardado",
  );

  if (bodegaGuardada) {
    document.getElementById("id_bodega").value = bodegaGuardada;
  }

  if (tipoMovimientoGuardado) {
    document.getElementById("tipoMovimientoSelect").value =
      tipoMovimientoGuardado;
  }
}

/* =========================
   INICIALIZACIÓN
========================= */
document.addEventListener("DOMContentLoaded", () => {
  inicializarApp();
  configurarEventos();
  cargarDatosUsuario();
  cargarBodegasUsuario();
  actualizarFecha();
  cargarCaracteristicas();
});

function inicializarApp() {
  verificarTokenAlCargar();
  actualizarEstadoVacio();
  configurarInputCodigo();
  gestionarCampoCaracteristicas();
  setInterval(actualizarFecha, 60000); // Actualizar cada minuto
  restaurarListaDesdeLocalStorage();
  restaurarBodegasUsadas();
  restaurarDatosFormulario();
}

/* =========================
   TOKEN Y AUTENTICACIÓN
========================= *//* =========================
   CARGA DE DATOS
========================= */
function cargarDatosUsuario() {
  const usuario = localStorage.getItem("nombre") || "Usuario";
  const bodega = localStorage.getItem("nombre_bodega") || "No asignada";

  document.getElementById("usuario").value = usuario;
  document.getElementById("bodegaActual").value = bodega;
  document.getElementById("current-user").textContent = usuario;
  document.getElementById("footer-user").textContent = usuario;
  document.getElementById("footer-bodega").textContent = bodega;
}

async function cargarBodegasUsuario() {
  try {
    const token = localStorage.getItem("token");

    const payload = JSON.parse(atob(token.split(".")[1]));
    const idUsuario = payload.id_usuario;

    const result = await apiFetch(`/bode/bodegas-usuario/${idUsuario}`);

    const selectBodega = document.getElementById("id_bodega");

    if (!selectBodega) {
      console.error("No se encontró el select id_bodega");
      return;
    }

    selectBodega.innerHTML = `<option value="">Seleccione bodega destino</option>`;

    if (!result.success) {
      console.error("Error en respuesta API");
      return;
    }

    result.data.forEach((bodega) => {
      const option = document.createElement("option");

      option.value = bodega.id_bodega;
      option.textContent = bodega.nombre;

      selectBodega.appendChild(option);
    });
  } catch (error) {
    console.error("Error cargando bodegas:", error);
  }
}

/* =========================
   GESTIÓN DE CARACTERÍSTICAS
========================= */
function gestionarCampoCaracteristicas() {
  const idBodega = localStorage.getItem("bodega");
  const container = document.getElementById("caracteristicas-container");
  const helpText = document.getElementById("caracteristicas-help");
  const select = document.getElementById("caracteristicas");

  if (!select || !container) return;

  if (Number(idBodega) === 6) {
    select.disabled = false;
    container.style.opacity = "1";
    helpText.style.display = "flex";
    select.classList.add("active");
  } else {
    select.disabled = true;
    container.style.opacity = "0.6";
    helpText.style.display = "none";
    select.classList.remove("active");
    select.value = "";
  }
}

/* =========================
   GESTIÓN DE PRODUCTOS
========================= */
function configurarInputCodigo() {
  const input = document.getElementById("codigo_producto");
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const codigo = input.value.trim();
      if (codigo) {
        agregarProducto(codigo);
        input.value = "";
        input.focus();
      }
    }
  });

  input.addEventListener("input", (e) => {
    // Auto-trim y validación
    e.target.value = e.target.value.trim();
  });
}

async function agregarProducto(codigo) {
  if (!validarDatosAntesAgregar()) return;
  if (!codigo) {
    mostrarNotificacion("Ingrese un código válido", "warning");
    return;
  }

  if (CARACTERISTICAS_VALIDAS.length === 0) {
    await cargarCaracteristicas();
  }

  const cantidadInput = document.getElementById("cantidad_manual");
  let cantidad = parseInt(cantidadInput.value, 10) || 1;
  const usuario = document.getElementById("usuario").value;
  const bodegaOrigen = document.getElementById("bodegaActual").value;
  const bodegaDestinoSelect = document.getElementById("id_bodega");
  const bodegaDestino = bodegaDestinoSelect.selectedOptions[0]?.text || "N/A";
  const tipoMovimiento = document.getElementById("tipoMovimientoSelect").value;

  // Si el origen es Terminada Completo (25), el código ingresado puede ser
  // un barcode: resolverlo al producto real y consumir uno por uno
  const idBodegaOrigen = Number(localStorage.getItem("bodega"));
  let codigoResuelto = codigo;

  if (idBodegaOrigen === 25) {
    const resuelto = await resolverProductoTerminada(codigo);
    if (resuelto && resuelto.codigo_producto) {
      codigoResuelto = resuelto.codigo_producto;

      if (resuelto.stock_disponible <= 0) {
        mostrarNotificacion("Sin stock en Terminada Proceso", "error");
        return;
      }
    }
  }

  const caracteristicasInput = document.getElementById("caracteristicas");
  let caracteristicas =
    caracteristicasInput?.value.trim().toUpperCase() || "";

  // SOLO validar características en estas bodegas
  if (esBodegaTerminada(idBodegaOrigen) && idBodegaOrigen !== 25) {
    if (!CARACTERISTICAS_VALIDAS.includes(caracteristicas)) {
      mostrarNotificacion("La característica ingresada no existe", "error");
      caracteristicasInput.focus();
      return;
    }
  } else {
    // en otras bodegas no se usa característica
    caracteristicas = "";
  }
  const fecha = formatearFechaCompleta();

  // Validar que no se exceda el stock disponible
  if (!(await validarStockDisponible(codigoResuelto, cantidad))) {
    mostrarNotificacion("Stock insuficiente para este producto", "error");
    return;
  }

  const clave = `${codigoResuelto}_${bodegaDestinoSelect.value}_${caracteristicas}`;

  if (productos[clave]) {
    productos[clave].cantidad += cantidad;
    actualizarFilaProducto(clave, productos[clave]);
    moverFilaInicio(clave);
  } else {
    const talla = obtenerTallaDesdeCodigo(codigoResuelto);

    productos[clave] = {
      codigo: codigoResuelto,
      usuario,
      bodegaOrigen,
      bodegaDestino,
      tipoMovimiento,
      caracteristicas,
      fecha,
      cantidad,
      talla,
      idBodegaDestino: bodegaDestinoSelect.value,
      codigoBarras: idBodegaOrigen === 25 ? codigo : "",
    };

    crearFilaProducto(clave, productos[clave]);
  }

  totalUnidades += cantidad;
  actualizarEstadisticas();
  cantidadInput.value = "";

  guardarListaEnLocalStorage();
  mostrarNotificacion(`Producto ${codigoResuelto} agregado`, "success");
}

function validarDatosAntesAgregar() {
  const bodegaDestino = document.getElementById("id_bodega").value;
  const tipoMovimiento = document.getElementById("tipoMovimientoSelect").value;

  if (!bodegaDestino) {
    mostrarNotificacion("Seleccione una bodega destino", "warning");
    return false;
  }

  if (!tipoMovimiento) {
    mostrarNotificacion("Seleccione un tipo de movimiento", "warning");
    return false;
  }

  return true;
}

async function validarStockDisponible(codigo, cantidad) {
  const idBodegaOrigen = Number(localStorage.getItem("bodega"));

  if (idBodegaOrigen === 25) return true;

  const bodegaActual = document.getElementById("bodegaActual")?.value || "";
  const bodegaDestinoSelect = document.getElementById("id_bodega");
  const bodegaDestino = bodegaDestinoSelect.selectedOptions[0]?.text || "";
  const tipoMovimiento =
    document.getElementById("tipoMovimientoSelect")?.value || "";

  let bodegaAConsultar = bodegaActual;

  // Consumo inverso (el SP descuenta del DESTINO y suma al origen)
  // para estas bodegas con tipo COMPLETO/PROCESO
  const bodegasConsumoInverso = [23, 2, 21, 6];
  if (
    bodegasConsumoInverso.includes(idBodegaOrigen) &&
    ["COMPLETO", "PROCESO"].includes(tipoMovimiento)
  ) {
    bodegaAConsultar = bodegaDestino;
  }

  try {
    const data = await apiFetch(
      `/product/stock?codigo_producto=${encodeURIComponent(codigo)}`,
    );

    const stock = (data.body || []).find(
      (s) => (s.bodega || "").toLowerCase() === bodegaAConsultar.toLowerCase(),
    );

    return stock ? stock.cantidad_disponible >= cantidad : false;
  } catch {
    return false;
  }
}

/* =========================
   MANEJO DE LA TABLA
========================= */
function crearFilaProducto(clave, producto) {
  const tbody = document
    .getElementById("tablaProductos")
    .getElementsByTagName("tbody")[0];

  const fila = document.createElement("tr");

  fila.dataset.codigo = clave;

  fila.classList.add(producto.tipoMovimiento.toLowerCase());

  fila.innerHTML = `
        <td>${escapeHtml(producto.usuario)}</td>
        <td>${escapeHtml(producto.bodegaOrigen)}</td>
        <td>${escapeHtml(producto.bodegaDestino)}</td>

        <td class="cantidad">
            <div class="quantity-control">
                <button class="qty-btn minus" data-codigo="${escapeHtml(clave)}">-</button>
                <span>${escapeHtml(producto.cantidad)}</span>
                <button class="qty-btn plus" data-codigo="${escapeHtml(clave)}">+</button>
            </div>
        </td>

        <td><span class="badge">${escapeHtml(producto.codigo)}</span></td>
        <td><span class="badge badge-primary">${escapeHtml(producto.talla)}</span></td>
        <td><span class="movement-type">${escapeHtml(producto.tipoMovimiento)}</span></td>
        <td>${escapeHtml(producto.caracteristicas)}</td>
        <td>${escapeHtml(producto.fecha)}</td>

        <td>
            <div class="action-buttons">
                <button class="btn-action btn-edit" data-codigo="${escapeHtml(clave)}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>

                <button class="btn-action btn-delete" data-codigo="${escapeHtml(clave)}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

  tbody.prepend(fila);

  actualizarEstadoVacio();
}

function moverFilaInicio(clave) {
  const tbody = document
    .getElementById("tablaProductos")
    .getElementsByTagName("tbody")[0];

  const fila = document.querySelector(`tr[data-codigo="${clave}"]`);

  if (fila) {
    tbody.prepend(fila);
  }
}

function actualizarFilaProducto(clave, producto) {
  const fila = document.querySelector(`tr[data-codigo="${clave}"]`);
  if (fila) {
    const cantidadElement = fila.querySelector(".cantidad span");
    if (cantidadElement) {
      cantidadElement.textContent = producto.cantidad;
    }
  }
}

function eliminarProducto(codigo) {
  if (!productos[codigo]) return;

  totalUnidades -= productos[codigo].cantidad;
  delete productos[codigo];

  const fila = document.querySelector(`tr[data-codigo="${codigo}"]`);
  if (fila) {
    fila.remove();
  }

  guardarListaEnLocalStorage();
  actualizarEstadisticas();
  mostrarNotificacion("Producto eliminado", "info");
}

function actualizarEstadisticas() {
  const totalProductos = Object.keys(productos).length;

  document.getElementById("totalProductos").textContent = totalProductos;
  document.getElementById("totalItems").textContent = `${totalProductos} items`;
  document.getElementById("totalQuantity").textContent =
    `${totalUnidades} unidades`;
  actualizarEstadoVacio();
}

function actualizarEstadoVacio() {
  const tbody = document
    .getElementById("tablaProductos")
    .getElementsByTagName("tbody")[0];
  const emptyState = document.getElementById("emptyState");

  if (tbody.children.length === 0) {
    emptyState.style.display = "flex";
  } else {
    emptyState.style.display = "none";
  }
}

/* =========================
   TRANSFERENCIA
========================= */
async function transferirProductos() {
  const filas = document.querySelectorAll("#tablaProductos tbody tr");
  if (filas.length === 0) {
    mostrarNotificacion("No hay productos para transferir", "warning");
    return;
  }

  const payload = {
    id_bodega_origen: +localStorage.getItem("bodega"),
    id_bodega_destino: +document.getElementById("id_bodega").value,
    id_usuario: +localStorage.getItem("id_usuario"),
    tipo_movimiento: document.getElementById("tipoMovimientoSelect").value,
    observaciones: document.getElementById("observaciones").value || "",
  };

  let transferenciasExitosas = 0;
  let transferenciasFallidas = 0;
  let codigosFinalizados = [];

  for (const fila of filas) {
    const clave = fila.dataset.codigo;

    const producto = productos[clave];

    const codigo = producto.codigo;
    const caracteristicas = producto.caracteristicas;

    try {

      // Terminada Completo (25): consumo de Terminada Proceso (6) uno por uno
      if (payload.id_bodega_origen === 25) {
        const dataConsumo = await apiFetch(
          "/product/consumo-terminada-proceso",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              codigo_producto: codigo,
              cantidad: producto.cantidad,
              id_usuario: payload.id_usuario,
              observaciones: payload.observaciones,
            }),
          },
        ).catch((error) => error.cuerpo || { error: error.message });

        if (dataConsumo.error) {
          document.getElementById("mensajeErrorStock").textContent =
            dataConsumo.error;
          document.getElementById("modalErrorStock").style.display = "flex";
          transferenciasFallidas++;
          continue;
        }

        transferenciasExitosas++;
        continue;
      }

      if (esBodegaTerminada(payload.id_bodega_origen) && caracteristicas?.trim()) {
        const tipoMovimiento = payload.id_bodega_origen === 25 ? "COMPLETO" : "PROCESO";
        const dataFinalizar = await apiFetch(
          "/product/finalizar-terminada",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              codigo_producto: codigo,
              caracteristica: caracteristicas,
              cantidad: producto.cantidad,
              id_bodega_origen: payload.id_bodega_origen,
              id_bodega_destino:
                producto.idBodegaDestino || payload.id_bodega_destino,
              id_usuario: payload.id_usuario,
              tipo_movimiento: tipoMovimiento,
            }),
          },
        ).catch((error) => error.cuerpo || { error: error.message });

        if (dataFinalizar.error) {
          document.getElementById("mensajeErrorStock").textContent =
            dataFinalizar.error;
          document.getElementById("modalErrorStock").style.display = "flex";
          transferenciasFallidas++;
          continue;
        }

        const nuevoCodigo = dataFinalizar.body?.mensaje || "";
        codigosFinalizados.push(nuevoCodigo);
        transferenciasExitosas++;
        continue;
      }

      // Realizar transferencia
      const result = await apiFetch("/product/transferencia", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          id_bodega_destino: producto.idBodegaDestino,
          codigo_producto: codigo,
          cantidad: producto.cantidad,
          caracteristicas: producto.caracteristicas,
        }),
      }).catch((error) => error.cuerpo || { error: error.message });

      if (result.error) {
        document.getElementById("mensajeErrorStock").textContent = result.error;
        document.getElementById("modalErrorStock").style.display = "flex";
        transferenciasFallidas++;
        continue;
      }

      transferenciasExitosas++;
    } catch (error) {
      console.error(`Error transferiendo producto ${codigo}:`, error);
      transferenciasFallidas++;
    }
  }

  // Limpiar después de la transferencia
  if (transferenciasExitosas > 0) {
    limpiarLista();

    let mensajeFinal = `${transferenciasExitosas} transferencias completadas exitosamente`;

    if (codigosFinalizados.length > 0) {
      mensajeFinal = `${codigosFinalizados.length} producto(s) finalizado(s) en Terminada`;
      const ultimoCodigo = codigosFinalizados[codigosFinalizados.length - 1];
      const codigoNuevo = ultimoCodigo.split("Nuevo codigo: ")[1] || "";
      if (codigoNuevo) mensajeFinal += ` -> Nuevo codigo: ${codigoNuevo}`;
    }

    mostrarNotificacion(mensajeFinal, "success");
  }

  if (transferenciasFallidas > 0) {
    mostrarNotificacion(
      `${transferenciasFallidas} transferencias fallaron`,
      "error",
    );
  }
}

function limpiarLista() {
  productos = {};
  totalUnidades = 0;

  const tbody = document
    .getElementById("tablaProductos")
    .getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";

  actualizarEstadisticas();

  localStorage.removeItem("productos_transferencia");
  localStorage.removeItem("total_unidades_transferencia");
  localStorage.removeItem("bodega_destino_id");
  localStorage.removeItem("bodegas_destino");

  document.getElementById("id_bodega").value = "";

  mostrarNotificacion("Lista limpiada", "info");
}

/* =========================
   UTILIDADES
========================= */
function formatearFechaCompleta() {
  const fecha = new Date();
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actualizarFecha() {
  const ahora = new Date();
  document.getElementById("currentDate").textContent = ahora.toLocaleDateString(
    "es-ES",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
  document.getElementById("lastUpdate").textContent = ahora.toLocaleTimeString(
    "es-ES",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function mostrarNotificacion(mensaje, tipo = "info") {
  toast(mensaje, tipo);
}

/* =========================
   CONFIGURACIÓN DE EVENTOS
========================= */
function configurarEventos() {
  const selectBodega = document.getElementById("id_bodega");
  const selectTipo = document.getElementById("tipoMovimientoSelect");

  if (selectBodega) {
    selectBodega.addEventListener("change", function () {
      const idBodega = this.value;

      let bodegasGuardadas =
        JSON.parse(localStorage.getItem("bodegas_destino")) || [];

      if (!bodegasGuardadas.includes(idBodega)) {
        bodegasGuardadas.push(idBodega);
      }

      localStorage.setItem("bodegas_destino", JSON.stringify(bodegasGuardadas));
    });
  }

  if (selectTipo) {
    selectTipo.addEventListener("change", function () {
      const tipo = this.value;

      localStorage.setItem("tipo_movimiento_guardado", tipo);
    });
  }

  // Select de bodega destino
  document.getElementById("id_bodega").addEventListener("change", (e) => {
    localStorage.setItem("bodega_destino_id", e.target.value);
    gestionarCampoCaracteristicas();
  });

  document
    .getElementById("tipoMovimientoSelect")
    .addEventListener("change", (e) => {
      localStorage.setItem("tipo_movimiento_guardado", e.target.value);
    });

  // Botón de transferencia
  document
    .getElementById("mover-productos")
    .addEventListener("click", transferirProductos);

  // Botón de limpiar lista
  document
    .getElementById("limpiar-lista")
    .addEventListener("click", limpiarLista);

  // Botón de agregar manual
  document.getElementById("agregar-manual").addEventListener("click", async () => {
    const codigo = await trostPedir("Ingrese el código del producto:", {
      titulo: "Agregar producto",
      placeholder: "Código o referencia",
      textoConfirmar: "Agregar",
    });

    if (codigo && codigo.trim()) {
      agregarProducto(codigo.trim());
    }
  });

  // Botón de escanear (placeholder)
  document.getElementById("scanBtn").addEventListener("click", () => {
    mostrarNotificacion("Función de escaneo disponible próximamente", "info");
  });

  // Delegación de eventos para la tabla
  document.getElementById("tablaProductos").addEventListener("click", async (e) => {
    const target = e.target;
    const codigo = target.closest("[data-codigo]")?.dataset.codigo;

    if (!codigo) return;

    // Botón eliminar
    if (target.closest(".btn-delete")) {
      const confirmado = await trostConfirmar("¿Está seguro de eliminar este producto?", {
        titulo: "Eliminar producto",
        textoConfirmar: "Eliminar",
        peligro: true,
      });

      if (confirmado) {
        eliminarProducto(codigo);
      }
    }

    // Botón editar
    if (target.closest(".btn-edit")) {
      editarProducto(codigo);
    }

    // Botones de cantidad
    if (target.closest(".qty-btn")) {
      const btn = target.closest(".qty-btn");
      if (btn.classList.contains("minus")) {
        modificarCantidad(codigo, -1);
      } else if (btn.classList.contains("plus")) {
        modificarCantidad(codigo, 1);
      }
    }
  });

  // Cerrar modal de error
  document
    .getElementById("cerrarModalErrorStock")
    .addEventListener("click", () => {
      document.getElementById("modalErrorStock").style.display = "none";
    });

  // Redirecciones del navbar
  document.getElementById("sesion").addEventListener("click", () => {
    window.location.href = "/sesion";
  });

  document.getElementById("transferencia").addEventListener("click", () => {
    window.location.href = "/supervisor";
  });
}

function modificarCantidad(codigo, cambio) {
  if (!productos[codigo]) return;

  const nuevaCantidad = productos[codigo].cantidad + cambio;
  if (nuevaCantidad < 1) {
    eliminarProducto(codigo);
    return;
  }

  productos[codigo].cantidad = nuevaCantidad;
  totalUnidades += cambio;
  actualizarFilaProducto(codigo, productos[codigo]);
  actualizarEstadisticas();
  guardarListaEnLocalStorage();
}

async function editarProducto(codigo) {
  const producto = productos[codigo];
  if (!producto) return;

  const nuevaCantidad = await trostPedir("Ingrese la nueva cantidad:", {
    titulo: "Editar cantidad",
    input: String(producto.cantidad),
    placeholder: "Cantidad",
    textoConfirmar: "Actualizar",
  });

  if (nuevaCantidad && !isNaN(nuevaCantidad) && parseInt(nuevaCantidad) > 0) {
    const cambio = parseInt(nuevaCantidad) - producto.cantidad;
    productos[codigo].cantidad = parseInt(nuevaCantidad);
    totalUnidades += cambio;
    actualizarFilaProducto(codigo, productos[codigo]);
    actualizarEstadisticas();
    guardarListaEnLocalStorage();
    mostrarNotificacion("Cantidad actualizada", "success");
  }
}

function obtenerTallaDesdeCodigo(codigo) {
  if (!codigo || codigo.length < 2) return "";
  return codigo.slice(-2);
}

function restaurarBodegasUsadas() {
  const bodegas = JSON.parse(localStorage.getItem("bodegas_destino"));

  if (!bodegas || bodegas.length === 0) return;

  const select = document.getElementById("id_bodega");

  const ultimaBodega = bodegas[bodegas.length - 1];

  select.value = ultimaBodega;
}
