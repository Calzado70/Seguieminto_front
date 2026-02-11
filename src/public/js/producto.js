/* =========================
   VARIABLES GLOBALES
========================= */
let productos = {};
let totalUnidades = 0;

/* =========================
   INICIALIZACIÓN
========================= */
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    configurarEventos();
    cargarDatosUsuario();
    cargarBodegas();
    actualizarFecha();
});

function inicializarApp() {
    verificarTokenAlCargar();
    actualizarEstadoVacio();
    configurarInputCodigo();
    setInterval(actualizarFecha, 60000); // Actualizar cada minuto
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

async function cargarBodegas() {
    const select = document.getElementById("id_bodega");
    if (!select) return;

    try {
        const res = await fetch("http://localhost:4000/bode/mostrar");
        const data = await res.json();

        if (data.success) {
            select.innerHTML = '<option value="">Seleccione bodega destino</option>';
            data.data.forEach(b => {
                const opt = document.createElement("option");
                opt.value = b.id_bodega;
                opt.textContent = b.nombre;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error cargando bodegas:", err);
        mostrarNotificacion("Error al cargar bodegas", "error");
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

    if (idBodega === "3") {
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

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = input.value.trim();
            if (codigo) {
                agregarProducto(codigo);
                input.value = "";
                input.focus();
            }
        }
    });

    input.addEventListener('input', (e) => {
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
    let cantidad = parseInt(cantidadInput.value, 10) || 1;
    const usuario = document.getElementById("usuario").value;
    const bodegaOrigen = document.getElementById("bodegaActual").value;
    const bodegaDestinoSelect = document.getElementById("id_bodega");
    const bodegaDestino = bodegaDestinoSelect.selectedOptions[0]?.text || "N/A";
    const tipoMovimiento = document.getElementById("tipoMovimientoSelect").value;
    const caracteristicas = document.getElementById("caracteristicas")?.value || "N/A";
    const fecha = formatearFechaCompleta();

    // Validar que no se exceda el stock disponible
    if (!validarStockDisponible(codigo, cantidad)) {
        mostrarNotificacion("Stock insuficiente para este producto", "error");
        return;
    }

    if (productos[codigo]) {
        productos[codigo].cantidad += cantidad;
        actualizarFilaProducto(codigo, productos[codigo]);
    } else {
    const talla = obtenerTallaDesdeCodigo(codigo);

    productos[codigo] = {
        usuario,
        bodegaOrigen,
        bodegaDestino,
        tipoMovimiento,
        caracteristicas,
        fecha,
        cantidad,
        talla, // 👈 NUEVO
        idBodegaDestino: bodegaDestinoSelect.value
    };

    crearFilaProducto(codigo, productos[codigo]);
}

    totalUnidades += cantidad;
    actualizarEstadisticas();
    cantidadInput.value = "";
    
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
function crearFilaProducto(codigo, producto) {
    const tbody = document.getElementById("tablaProductos").getElementsByTagName('tbody')[0];
    const fila = document.createElement("tr");
    fila.dataset.codigo = codigo;
    fila.classList.add(producto.tipoMovimiento.toLowerCase());
    
    fila.innerHTML = `
        <td>${producto.usuario}</td>
        <td>${producto.bodegaOrigen}</td>
        <td>${producto.bodegaDestino}</td>
        <td class="cantidad">
            <div class="quantity-control">
                <button class="qty-btn minus" data-codigo="${codigo}">-</button>
                <span>${producto.cantidad}</span>
                <button class="qty-btn plus" data-codigo="${codigo}">+</button>
            </div>
        </td>
        <td><span class="badge">${codigo}</span></td>
        <td><span class="badge badge-primary">${producto.talla}</span></td>
        <td><span class="movement-type">${producto.tipoMovimiento}</span></td>
        <td>${producto.caracteristicas}</td>
        <td>${producto.fecha}</td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-edit" data-codigo="${codigo}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" data-codigo="${codigo}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(fila);
    actualizarEstadoVacio();
}

function actualizarFilaProducto(codigo, producto) {
    const fila = document.querySelector(`tr[data-codigo="${codigo}"]`);
    if (fila) {
        const cantidadElement = fila.querySelector('.cantidad span');
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
    
    actualizarEstadisticas();
    mostrarNotificacion("Producto eliminado", "info");
}

function actualizarEstadisticas() {
    const totalProductos = Object.keys(productos).length;
    
    document.getElementById("totalProductos").textContent = totalProductos;
    document.getElementById("totalItems").textContent = `${totalProductos} items`;
    document.getElementById("totalQuantity").textContent = `${totalUnidades} unidades`;
    actualizarEstadoVacio();
}

function actualizarEstadoVacio() {
    const tbody = document.getElementById("tablaProductos").getElementsByTagName('tbody')[0];
    const emptyState = document.getElementById("emptyState");
    
    if (tbody.children.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
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
        id_bodega_destino: +localStorage.getItem("bodega_destino_id"),
        id_usuario: +localStorage.getItem("id_usuario"),
        tipo_movimiento: document.getElementById("tipoMovimientoSelect").value,
        observaciones: document.getElementById("observaciones").value || ""
    };

    let transferenciasExitosas = 0;
    let transferenciasFallidas = 0;

    for (const fila of filas) {
        const codigo = fila.dataset.codigo;
        const producto = productos[codigo];
        const caracteristicas = producto.caracteristicas;

        try {
            // Actualizar características si es bodega 3
            if (payload.id_bodega_origen === 3 && caracteristicas !== "N/A") {
                await fetch("http://localhost:4000/product/actualizar", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        codigo_producto: codigo, 
                        nueva_caracteristica: caracteristicas 
                    })
                });
            }

            // Realizar transferencia
            const res = await fetch("http://localhost:4000/product/transferencia", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    ...payload, 
                    codigo_producto: codigo, 
                    cantidad: producto.cantidad, 
                    caracteristicas 
                })
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
            "success"
        );
    }

    if (transferenciasFallidas > 0) {
        mostrarNotificacion(
            `${transferenciasFallidas} transferencias fallaron`, 
            "error"
        );
    }
}

function limpiarLista() {
    productos = {};
    totalUnidades = 0;
    
    const tbody = document.getElementById("tablaProductos").getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    
    actualizarEstadisticas();
    mostrarNotificacion("Lista limpiada", "info");
}

/* =========================
   UTILIDADES
========================= */
function formatearFechaCompleta() {
    const fecha = new Date();
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function actualizarFecha() {
    const ahora = new Date();
    document.getElementById("currentDate").textContent = 
        ahora.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    document.getElementById("lastUpdate").textContent = 
        ahora.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
}

function mostrarNotificacion(mensaje, tipo = "info") {
    const config = {
        text: mensaje,
        duration: 3000,
        gravity: "top",
        position: "right",
        stopOnFocus: true
    };

    switch(tipo) {
        case "success":
            config.style = {
                background: "linear-gradient(to right, #00b09b, #96c93d)"
            };
            break;
        case "error":
            config.style = {
                background: "linear-gradient(to right, #ff5e62, #ff9966)"
            };
            break;
        case "warning":
            config.style = {
                background: "linear-gradient(to right, #ffa502, #ff7f00)"
            };
            break;
        default:
            config.style = {
                background: "linear-gradient(to right, #13302E, #1a403d)"
            };
    }

    Toastify(config).showToast();
}

/* =========================
   CONFIGURACIÓN DE EVENTOS
========================= */
function configurarEventos() {
    // Select de bodega destino
    document.getElementById("id_bodega").addEventListener("change", e => {
        localStorage.setItem("bodega_destino_id", e.target.value);
        gestionarCampoCaracteristicas();
    });

    // Botón de transferencia
    document.getElementById("mover-productos").addEventListener("click", transferirProductos);

    // Botón de limpiar lista
    document.getElementById("limpiar-lista").addEventListener("click", limpiarLista);

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
    document.getElementById("tablaProductos").addEventListener("click", e => {
        const target = e.target;
        const codigo = target.closest('[data-codigo]')?.dataset.codigo;

        if (!codigo) return;

        // Botón eliminar
        if (target.closest('.btn-delete')) {
            if (confirm("¿Está seguro de eliminar este producto?")) {
                eliminarProducto(codigo);
            }
        }

        // Botón editar
        if (target.closest('.btn-edit')) {
            editarProducto(codigo);
        }

        // Botones de cantidad
        if (target.closest('.qty-btn')) {
            const btn = target.closest('.qty-btn');
            if (btn.classList.contains('minus')) {
                modificarCantidad(codigo, -1);
            } else if (btn.classList.contains('plus')) {
                modificarCantidad(codigo, 1);
            }
        }
    });

    // Cerrar modal de error
    document.getElementById("cerrarModalErrorStock").addEventListener("click", () => {
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
        mostrarNotificacion("Cantidad actualizada", "success");
    }
}

function obtenerTallaDesdeCodigo(codigo) {
    if (!codigo || codigo.length < 2) return "";
    return codigo.slice(-2);
}
