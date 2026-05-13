let bodegasData = [];
let inventarioCompleto = [];
let inventarioFiltrado = [];
let paginaActual = 1;
const elementosPorPagina = 10;

/* ==========================
   UTILIDADES
========================== */

function obtenerTallaDesdeCodigo(codigo) {
    if (!codigo) return '-';
    const texto = codigo.toString();
    return texto.length >= 2 ? texto.slice(-2) : '-';
}

/* ==========================
   TOKEN
========================== */

function verificarTokenAlCargar() {
    const token = localStorage.getItem('token');
    if (!token) return window.location.href = '/';

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('currentUserName').textContent = payload.nombre || 'Usuario';
        document.getElementById('currentUserRole').textContent = payload.rol || 'Rol';

        if (Date.now() >= payload.exp * 1000) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    } catch {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

/* ==========================
   CONSULTAR INVENTARIO
========================== */

async function consultarInventario() {
    const nombre_bodega = document.getElementById('nombre_bodega').value;
    const tabla = document.getElementById('tablaInventario');
    const empty = document.getElementById('empty-state');

    tabla.style.display = 'none';
    empty.style.display = 'flex';
    empty.innerHTML = `<i class="fas fa-spinner fa-spin"></i><p>Cargando...</p>`;

    try {
        const token = localStorage.getItem('token');
        let url = `http://localhost:4000/product/inventario`;
        if (nombre_bodega) url += `?nombre_bodega=${encodeURIComponent(nombre_bodega)}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        inventarioCompleto = data.body;
        console.log("Respuesta API:", data);
        inventarioFiltrado = [...inventarioCompleto];
        paginaActual = 1;

        if (inventarioFiltrado.length === 0) {
            empty.innerHTML = `<i class="fas fa-box-open"></i><p>No hay inventario</p>`;
            return;
        }

        tabla.style.display = 'table';
        empty.style.display = 'none';
        mostrarPagina(paginaActual);

    } catch (err) {
        empty.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>${err.message}</p>`;
    }
}

/* ==========================
   FILTRO POR CÓDIGO
========================== */

function filtrarPorCodigo() {
    const texto = document.getElementById('buscarCodigo').value.toLowerCase();
    inventarioFiltrado = inventarioCompleto.filter(p =>
        p.codigo.toLowerCase().includes(texto)
    );
    paginaActual = 1;
    mostrarPagina(paginaActual);
}

/* ==========================
   TABLA + PAGINACIÓN
========================== */

function mostrarPagina(pagina) {
    const tbody = document.querySelector('#tablaInventario tbody');
    tbody.innerHTML = '';

    const inicio = (pagina - 1) * elementosPorPagina;
    const fin = inicio + elementosPorPagina;

    inventarioFiltrado.slice(inicio, fin).forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.bodega}</td>
          <td>${p.codigo}</td>
          <td>${p.ultima_observacion || '-'}</td>
          <td>${obtenerTallaDesdeCodigo(p.codigo)}</td>
          <td class="${getClaseStock(p.cantidad_disponible)}">${p.cantidad_disponible}</td>
          <td>${p.caracteristica}</td>
          <td>${new Date(p.fecha_actualizacion).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });

    actualizarPaginador();
}

function actualizarPaginador() {
    let pag = document.getElementById('paginador');
    if (!pag) {
        pag = document.createElement('div');
        pag.id = 'paginador';
        pag.className = 'paginador';
        document.querySelector('.table-container').appendChild(pag);
    }

    const total = Math.ceil(inventarioFiltrado.length / elementosPorPagina);
    if (total <= 1) return pag.style.display = 'none';

    pag.style.display = 'flex';
    pag.innerHTML = `
      <div class="paginador-info">
        Página ${paginaActual} de ${total}
      </div>
      <div class="paginador-controles">
        <button ${paginaActual === 1 ? 'disabled' : ''} onclick="cambiarPagina(${paginaActual - 1})">◀</button>
        <button ${paginaActual === total ? 'disabled' : ''} onclick="cambiarPagina(${paginaActual + 1})">▶</button>
      </div>
    `;
}

function cambiarPagina(p) {
    paginaActual = p;
    mostrarPagina(paginaActual);
}

/* ==========================
   BODEGAS + NAV
========================== */

async function cargarBodegas() {
    const select = document.getElementById('nombre_bodega');
    const token = localStorage.getItem('token');

    const res = await fetch('http://localhost:4000/bode/mostrar', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    data.data.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.nombre;
        opt.textContent = b.nombre;
        select.appendChild(opt);
    });
}

function setupNavigation() {
    ['adminUsuario', 'bodegas', 'historial'].forEach(id => {
        document.getElementById(id).addEventListener('change', e => {
            if (e.target.value) window.location.href = e.target.value;
        });
    });
}

/* ==========================
   COLORES DE STOCK
========================== */
function getClaseStock(stock) {
    if (stock <= 0) return 'stock-rojo';
    if (stock < 50) return 'stock-amarillo';
    return 'stock-verde';
}

/* ==========================
   ORDENAR COLUMNAS
========================== */
let ordenAsc = true;

function ordenar(campo) {

    inventarioFiltrado.sort((a, b) => {

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
    mostrarPagina(1);
}

/* ==========================
   EXPORTAR A EXCEL
========================== */
function exportarExcel() {

    let csv = "Bodega,Codigo,Talla,Disponible,Caracteristica,Fecha\n";

    inventarioFiltrado.forEach(p => {
        csv += `${p.bodega},${p.codigo},${obtenerTallaDesdeCodigo(p.codigo)},${p.cantidad_disponible},${p.caracteristica},${p.fecha_actualizacion}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventario.csv";
    link.click();
}

function aplicarFiltros() {

    const codigo = document.getElementById('buscarCodigo').value.toLowerCase();
    const talla = document.getElementById('filtroTalla').value;
    const caracteristica = document.getElementById('filtroCaracteristica').value.toLowerCase();
    const stock = document.getElementById('filtroStock').value;

    inventarioFiltrado = inventarioCompleto.filter(p => {

        const tallaProd = obtenerTallaDesdeCodigo(p.codigo);

        let cumple = true;

        if (codigo && !p.ultima_observacion.toLowerCase().includes(codigo)) {
            cumple = false;
        }

        if (talla && tallaProd !== talla) {
            cumple = false;
        }

        if (caracteristica && !p.caracteristica?.toLowerCase().includes(caracteristica)) {
            cumple = false;
        }

        if (stock === 'bajo' && p.cantidad_disponible >= 50) {
            cumple = false;
        }

        if (stock === 'critico' && p.cantidad_disponible > 0) {
            cumple = false;
        }

        return cumple;
    });

    mostrarPagina(1);
}

/* ==========================
   INIT
========================== */

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarBodegas();
    setupNavigation();
    consultarInventario();
    document.getElementById('buscarCodigo').addEventListener('input', aplicarFiltros);
    document.getElementById('filtroTalla').addEventListener('input', aplicarFiltros);
    document.getElementById('filtroCaracteristica').addEventListener('input', aplicarFiltros);
    document.getElementById('filtroStock').addEventListener('change', aplicarFiltros);
});
