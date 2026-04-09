/* =========================
   VARIABLES GLOBALES
========================= */
let productos = {};
let totalUnidades = 0;

/* =========================
   CARACTERÍSTICAS VÁLIDAS
========================= */
const CARACTERISTICAS_VALIDAS = [  "40PP", "41P",  "42P",  "43P",  "44P",  "45P",  "46P",  "47P",  "48P",  "49P",  "50P",  "51P",
  "52P",  "53P",  "54P",  "55P",  "56P",  "57P",  "58P",  "59P",  "60P",  "61P",  "62P",  "63P",  "64P",  "65P",  "66P",
  "67P",  "68P",  "69P",  "70P",  "71P",  "72P",  "73P",  "74P",  "75P",  "76P",  "77P",  "78P",  "79P",  "80P",  "81P",
  "82P",  "83P",  "84P",  "85P",  "86P",  "87P",  "88P",  "89P",  "90P",  "91P",  "92P",  "93P",  "30P",  "95P",  "110P",
  "120P",  "130P",  "201P",  "215P",  "220P",  "225P",];

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
========================= */
function verificarTokenAlCargar() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (Date.now() >= payload.exp * 1000) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    if (payload.id_usuario) {
      localStorage.setItem("id_usuario", payload.id_usuario);
    }
  } catch (err) {
    console.error("Token inválido:", err);
    localStorage.clear();
    window.location.href = "/";
  }
}

/* =========================
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

    const response = await fetch(
      `http://192.168.1.13:4000/bode/bodegas-usuario/${idUsuario}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();

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

  if (idBodega === "6" || idBodega === "24") {
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

function agregarProducto(codigo) {
  if (!validarDatosAntesAgregar()) return;
  if (!codigo) {
    mostrarNotificacion("Ingrese un código válido", "warning");
    return;
  }

  const cantidadInput = document.getElementById("cantidad_manual");
  let cantidad = parseInt(cantidadInput.value, 10) || 0.5;
  const usuario = document.getElementById("usuario").value;
  const bodegaOrigen = document.getElementById("bodegaActual").value;
  const bodegaDestinoSelect = document.getElementById("id_bodega");
  const bodegaDestino = bodegaDestinoSelect.selectedOptions[0]?.text || "N/A";
  const tipoMovimiento = document.getElementById("tipoMovimientoSelect").value;
  const caracteristicasInput = document.getElementById("caracteristicas");
  let caracteristicas =
    caracteristicasInput?.value.trim().toUpperCase() || "N/A";

  // VALIDAR SI EXISTE EN LA LISTA
  const idBodegaOrigen = localStorage.getItem("bodega");

  // SOLO validar características en estas bodegas
  if (idBodegaOrigen === "6" || idBodegaOrigen === "24") {
    if (!CARACTERISTICAS_VALIDAS.includes(caracteristicas)) {
      mostrarNotificacion("La característica ingresada no existe", "error");
      caracteristicasInput.focus();
      return;
    }
  } else {
    // en otras bodegas no se usa característica
    caracteristicas = "N/A";
  }
  const fecha = formatearFechaCompleta();

  // Validar que no se exceda el stock disponible
  if (!validarStockDisponible(codigo, cantidad)) {
    mostrarNotificacion("Stock insuficiente para este producto", "error");
    return;
  }

  const clave = `${codigo}_${bodegaDestinoSelect.value}`;

  if (productos[clave]) {
    productos[clave].cantidad += cantidad;
    actualizarFilaProducto(clave, productos[clave]);
  } else {
    const talla = obtenerTallaDesdeCodigo(codigo);

    productos[clave] = {
      codigo,
      usuario,
      bodegaOrigen,
      bodegaDestino,
      tipoMovimiento,
      caracteristicas,
      fecha,
      cantidad,
      talla,
      idBodegaDestino: bodegaDestinoSelect.value,
    };

    crearFilaProducto(clave, productos[clave]);
  }

  totalUnidades += cantidad;
  actualizarEstadisticas();
  cantidadInput.value = "";

  guardarListaEnLocalStorage();
  mostrarNotificacion(`Producto ${codigo} agregado`, "success");
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

function validarStockDisponible(codigo, cantidad) {
  // Aquí puedes implementar la validación real del stock
  // Por ahora retornamos true como placeholder
  return true;
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
        <td>${producto.usuario}</td>
        <td>${producto.bodegaOrigen}</td>
        <td>${producto.bodegaDestino}</td>

        <td class="cantidad">
            <div class="quantity-control">
                <button class="qty-btn minus" data-codigo="${clave}">-</button>
                <span>${producto.cantidad}</span>
                <button class="qty-btn plus" data-codigo="${clave}">+</button>
            </div>
        </td>

        <td><span class="badge">${producto.codigo}</span></td>
        <td><span class="badge badge-primary">${producto.talla}</span></td>
        <td><span class="movement-type">${producto.tipoMovimiento}</span></td>
        <td>${producto.caracteristicas}</td>
        <td>${producto.fecha}</td>

        <td>
            <div class="action-buttons">
                <button class="btn-action btn-edit" data-codigo="${clave}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>

                <button class="btn-action btn-delete" data-codigo="${clave}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

  tbody.appendChild(fila);

  actualizarEstadoVacio();
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

  for (const fila of filas) {
    const clave = fila.dataset.codigo;

    const producto = productos[clave];

    const codigo = producto.codigo;
    const caracteristicas = producto.caracteristicas;

    try {
      // Actualizar características si es bodega 6
      if (
        payload.id_bodega_origen === 6 &&
        payload.id_bodega_destino === 24 &&
        caracteristicas !== "N/A"
      ) {
        await fetch("http://192.168.1.13:4000/product/actualizar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo_producto: codigo,
            nueva_caracteristica: caracteristicas,
          }),
        });
      }

      const token = localStorage.getItem("token");

      // Realizar transferencia
      const res = await fetch("http://192.168.1.13:4000/product/transferencia", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload,
          id_bodega_destino: producto.idBodegaDestino,
          codigo_producto: codigo,
          cantidad: producto.cantidad,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
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
    mostrarNotificacion(
      `${transferenciasExitosas} transferencias completadas exitosamente`,
      "success",
    );
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
  const config = {
    text: mensaje,
    duration: 3000,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
  };

  switch (tipo) {
    case "success":
      config.style = {
        background: "linear-gradient(to right, #00b09b, #96c93d)",
      };
      break;
    case "error":
      config.style = {
        background: "linear-gradient(to right, #ff5e62, #ff9966)",
      };
      break;
    case "warning":
      config.style = {
        background: "linear-gradient(to right, #ffa502, #ff7f00)",
      };
      break;
    default:
      config.style = {
        background: "linear-gradient(to right, #13302E, #1a403d)",
      };
  }

  Toastify(config).showToast();
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
  document.getElementById("agregar-manual").addEventListener("click", () => {
    const codigo = prompt("Ingrese el código del producto:");
    if (codigo && codigo.trim()) {
      agregarProducto(codigo.trim());
    }
  });

  // Botón de escanear (placeholder)
  document.getElementById("scanBtn").addEventListener("click", () => {
    mostrarNotificacion("Función de escaneo disponible próximamente", "info");
  });

  // Delegación de eventos para la tabla
  document.getElementById("tablaProductos").addEventListener("click", (e) => {
    const target = e.target;
    const codigo = target.closest("[data-codigo]")?.dataset.codigo;

    if (!codigo) return;

    // Botón eliminar
    if (target.closest(".btn-delete")) {
      if (confirm("¿Está seguro de eliminar este producto?")) {
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

function editarProducto(codigo) {
  const producto = productos[codigo];
  if (!producto) return;

  const nuevaCantidad = prompt("Ingrese la nueva cantidad:", producto.cantidad);
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
