// ===============================
// CONFIGURACIÓN GLOBAL
// ===============================

const API_BASE = "http://192.168.1.13:4000";
const ELEMENTOS_POR_PAGINA = 10;

let inventarioCompleto = [];
let paginaActual = 1;
let ordenAsc = true;

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
        const data = await fetchSeguro(`${API_BASE}/product/inventario`);
        if (!data) return;

        if (data?.body?.length > 0) {

            let resultado = data.body;

            // FILTRO POR BODEGA
            if (nombre_bodega) {
                resultado = resultado.filter(item =>
                    (item.bodega || '').toLowerCase() === nombre_bodega.toLowerCase()
                );
            }

            // FILTRO POR CÓDIGO
            if (codigoBusqueda) {
                resultado = resultado.filter(item =>
                    (item.codigo || '').toLowerCase().includes(codigoBusqueda.toLowerCase())
                );
            }

            inventarioCompleto = aplicarFiltrosAvanzados(resultado);
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
// FILTROS AVANZADOS
// ===============================

function aplicarFiltrosAvanzados(data) {

    const tallaFiltro = document.getElementById("filtroTalla")?.value;
    const caracteristicaFiltro = document.getElementById("filtroCaracteristica")?.value?.toLowerCase();
    const stockFiltro = document.getElementById("filtroStock")?.value;

    return data.filter(item => {

        let cumple = true;

        const talla = obtenerTallaDesdeCodigo(item.codigo);

        if (tallaFiltro && talla !== tallaFiltro) {
            cumple = false;
        }

        if (caracteristicaFiltro && !(item.caracteristica || '').toLowerCase().includes(caracteristicaFiltro)) {
            cumple = false;
        }

        if (stockFiltro === 'bajo' && item.cantidad_disponible >= 50) {
            cumple = false;
        }

        if (stockFiltro === 'critico' && item.cantidad_disponible > 0) {
            cumple = false;
        }

        return cumple;
    });
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
            <td>${escapeHTML(producto.ultima_observacion || '-')}</td>
            <td class="talla-cell">${escapeHTML(talla)}</td>
            <td class="cantidad-cell ${getClaseStock(producto.cantidad_disponible)}">${producto.cantidad_disponible}</td>
            <td>${escapeHTML(producto.caracteristica || '')}</td>
            <td>${formatearFecha(producto.fecha_actualizacion)}</td>
        `;

        tbody.appendChild(row);
    });
}

// ===============================
// UTILIDADES
// ===============================

function obtenerTallaDesdeCodigo(codigo) {
    if (!codigo || codigo.length < 2) return "-";
    return codigo.slice(-2);
}

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
// PAGINADOR
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

    controles.appendChild(crearBotonPagina("«", paginaActual - 1, paginaActual === 1));

    for (let i = 1; i <= totalPaginas; i++) {
        const btn = crearBotonPagina(i, i, false);
        if (i === paginaActual) btn.classList.add("active");
        controles.appendChild(btn);
    }

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
// STOCK COLOR
// ===============================

function getClaseStock(stock) {
    if (stock <= 0) return 'stock-rojo';
    if (stock < 50) return 'stock-amarillo';
    return 'stock-verde';
}

// ===============================
// ORDENAR
// ===============================

function ordenar(campo) {

    inventarioCompleto.sort((a, b) => {

        let A = a[campo];
        let B = b[campo];

        if (campo === 'talla') {
            A = obtenerTallaDesdeCodigo(a.codigo);
            B = obtenerTallaDesdeCodigo(b.codigo);
        }

        if (typeof A === 'string') A = A.toLowerCase();
        if (typeof B === 'string') B = B.toLowerCase();

        if (A < B) return ordenAsc ? -1 : 1;
        if (A > B) return ordenAsc ? 1 : -1;
        return 0;
    });

    ordenAsc = !ordenAsc;

    renderizarTabla();
    renderizarPaginador();
}

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    verificarSesion();
    cargarBodegas();
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