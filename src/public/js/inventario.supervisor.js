// ===============================
// CONFIGURACIÓN GLOBAL
// ===============================

const API_BASE = "http://192.168.1.13:4000";
const ELEMENTOS_POR_PAGINA = 10;

let inventarioCompleto = [];
let paginaActual = 1;

// ===============================
// UTILIDADES JWT
// ===============================

function obtenerToken() {
    return localStorage.getItem("token");
}

function decodificarToken(token) {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch {
        return null;
    }
}

function tokenExpirado(payload) {
    if (!payload || !payload.exp) return true;
    return payload.exp * 1000 < Date.now();
}

function cerrarSesion() {
    localStorage.removeItem("token");
    window.location.href = "/login";
}

function verificarSesion() {
    const token = obtenerToken();
    if (!token) return cerrarSesion();

    const payload = decodificarToken(token);
    if (!payload || tokenExpirado(payload)) {
        return cerrarSesion();
    }

    document.getElementById("currentUserName").textContent =
        payload.nombre || "Usuario";

    document.getElementById("currentUserRole").textContent =
        payload.rol || "Rol";
}

// ===============================
// FETCH SEGURO CON JWT
// ===============================

async function fetchSeguro(url) {
    const token = obtenerToken();

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        cerrarSesion();
        return null;
    }

    return response.json();
}

// ===============================
// CARGAR BODEGAS
// ===============================

async function cargarBodegas() {
    const select = document.getElementById("nombre_bodega");

    try {
        const data = await fetchSeguro(`${API_BASE}/bode/mostrar`);

        select.innerHTML = `<option value="">-- Seleccione --</option>`;

        if (data?.success && Array.isArray(data.data)) {
            data.data.forEach(bodega => {
                const option = document.createElement("option");
                option.value = bodega.nombre;
                option.textContent = bodega.nombre;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = `<option value="">Sin bodegas</option>`;
        }
    } catch {
        select.innerHTML = `<option value="">Error al cargar</option>`;
    }
}

// ===============================
// CONSULTAR INVENTARIO
// ===============================

async function consultarInventario() {
    const nombre_bodega = document.getElementById("nombre_bodega").value.trim();
    const codigoBusqueda = document.getElementById("codigo_busqueda").value.trim();

    const tabla = document.getElementById("tablaInventario");
    const emptyState = document.getElementById("empty-state");

    tabla.style.display = "none";
    emptyState.style.display = "flex";
    emptyState.innerHTML = `<i class="fas fa-spinner fa-spin"></i><p>Cargando inventario...</p>`;

    try {
        // SIEMPRE consulta todo el inventario
        const data = await fetchSeguro(`${API_BASE}/product/inventario`);

        if (data?.body?.length > 0) {

            let resultado = data.body;

            // FILTRO POR BODEGA
            if (nombre_bodega) {
                resultado = resultado.filter(item =>
                    item.bodega.toLowerCase() === nombre_bodega.toLowerCase()
                );
            }

            // FILTRO POR CÓDIGO
            if (codigoBusqueda) {
                resultado = resultado.filter(item =>
                    item.codigo.toLowerCase().includes(codigoBusqueda.toLowerCase())
                );
            }

            inventarioCompleto = resultado;
            paginaActual = 1;

            if (inventarioCompleto.length > 0) {
                renderizarTabla();
                renderizarPaginador();
                tabla.style.display = "table";
                emptyState.style.display = "none";
            } else {
                emptyState.innerHTML = `
                    <i class="fas fa-box-open"></i>
                    <p>No se encontraron resultados con los filtros aplicados</p>
                `;
            }

        } else {
            inventarioCompleto = [];
            emptyState.innerHTML = `
                <i class="fas fa-box-open"></i>
                <p>No hay inventario disponible</p>
            `;
        }

    } catch (error) {
        emptyState.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error al cargar el inventario</p>
        `;
    }
}

// ===============================
// RENDER TABLA
// ===============================

function renderizarTabla() {
    const tbody = document.querySelector("#tablaInventario tbody");
    tbody.innerHTML = "";

    const inicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
    const fin = inicio + ELEMENTOS_POR_PAGINA;
    const datosPagina = inventarioCompleto.slice(inicio, fin);

    datosPagina.forEach(producto => {
        const row = document.createElement("tr");

        const codigo = producto.codigo || "";
        const talla = obtenerTallaDesdeCodigo(codigo);

        row.innerHTML = `
            <td>${escapeHTML(producto.bodega)}</td>
            <td class="codigo-cell">${escapeHTML(codigo)}</td>
            <td class="talla-cell">${escapeHTML(talla)}</td>
            <td>${escapeHTML(producto.caracteristica)}</td>
            <td class="cantidad-cell">${producto.cantidad_disponible}</td>
            <td>${formatearFecha(producto.fecha_actualizacion)}</td>
        `;

        tbody.appendChild(row);
    });
}

function obtenerTallaDesdeCodigo(codigo) {
    if (!codigo || codigo.length < 2) return "-";

    // Toma los últimos 2 caracteres
    return codigo.slice(-2);
}


// ===============================
// PAGINADOR COMPLETO
// ===============================

function renderizarPaginador() {
    eliminarPaginadorExistente();

    const totalPaginas = Math.ceil(inventarioCompleto.length / ELEMENTOS_POR_PAGINA);
    if (totalPaginas <= 1) return;

    const contenedor = document.createElement("div");
    contenedor.className = "paginador";

    const info = document.createElement("div");
    info.className = "paginador-info";
    info.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    const controles = document.createElement("div");
    controles.className = "paginador-controles";

    // Botón anterior
    controles.appendChild(crearBotonPagina("«", paginaActual - 1, paginaActual === 1));

    // Botones numerados
    for (let i = 1; i <= totalPaginas; i++) {
        const btn = crearBotonPagina(i, i, false);
        if (i === paginaActual) btn.classList.add("active");
        controles.appendChild(btn);
    }

    // Botón siguiente
    controles.appendChild(crearBotonPagina("»", paginaActual + 1, paginaActual === totalPaginas));

    contenedor.appendChild(info);
    contenedor.appendChild(controles);

    document.querySelector(".table-container").appendChild(contenedor);
}

function crearBotonPagina(texto, paginaDestino, deshabilitado) {
    const btn = document.createElement("button");
    btn.className = "paginador-btn";
    btn.textContent = texto;

    if (deshabilitado) btn.disabled = true;

    btn.addEventListener("click", () => {
        paginaActual = paginaDestino;
        renderizarTabla();
        renderizarPaginador();
    });

    return btn;
}

function eliminarPaginadorExistente() {
    const existente = document.querySelector(".paginador");
    if (existente) existente.remove();
}

// ===============================
// UTILIDADES
// ===============================

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString();
}

function escapeHTML(text) {
    if (!text) return "";
    return text.replace(/[&<>"']/g, function (match) {
        const escape = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };
        return escape[match];
    });
}

// ===============================
// INICIALIZACIÓN
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    verificarSesion();
    cargarBodegas();

    // Exponer función global para el botón HTML
    window.consultarInventario = consultarInventario;
});

document.addEventListener("DOMContentLoaded", function () {
    const botones = document.querySelectorAll("button[data-ruta]");

    botones.forEach(boton => {
      boton.addEventListener("click", function () {
        const ruta = this.getAttribute("data-ruta");
        window.location.href = ruta;
      });
    });
  });
