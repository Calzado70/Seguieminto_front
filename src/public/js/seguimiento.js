let movimientosCompletos = [];
let paginaActual = 1;
let registrosPorPagina = 10;

/* ========= UTILIDAD PARA TALLA ========= */
function obtenerTalla(codigoBarras) {
    if (!codigoBarras) return 'N/A';
    const talla = codigoBarras.toString().slice(-2);
    return talla.padStart(2, '0');
}

/* ========= TOKEN ========= */
function verificarTokenAlCargar() {
    const token = localStorage.getItem('token');
    if (!token) return window.location.href = '/';

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (Date.now() >= payload.exp * 1000) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    } catch {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

/* ========= CARGAR MOVIMIENTOS ========= */
async function cargarMovimientos(idBodega = null, fechaInicio = null, fechaFin = null, codigoInteligente = null) {
    const token = localStorage.getItem('token');
    let url = 'http://192.168.1.13:4000/product/movi';
    const params = new URLSearchParams();

    if (idBodega) params.append('id_bodega', idBodega);
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    if (codigoInteligente) params.append('codigo_inteligente', codigoInteligente);

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        movimientosCompletos = data.body || [];
        paginaActual = 1;
        actualizarTotalRegistros();
        actualizarTablaPaginada();
        actualizarControlesPaginacion();
        actualizarInfoPagina();
    } catch (error) {
        console.error('Error al cargar movimientos:', error);
        mostrarMensaje('Error al cargar los movimientos', 'error');
    }
}

/* ========= TABLA ========= */
function actualizarTablaPaginada() {
    const tbody = document.querySelector('#tabla-movimientos tbody');
    tbody.innerHTML = '';

    if (movimientosCompletos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>No se encontraron movimientos</p>
                </td>
            </tr>`;
        return;
    }

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;

    movimientosCompletos.slice(inicio, fin).forEach((m, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.codigo || 'N/A'}</td>
            <td>${m.observaciones || 'N/A'}</td>
            <td>${obtenerTalla(m.codigo)}</td>
            <td><span class="badge">${m.cantidad}</span></td>
            <td>${m.bodega_origen || 'N/A'}</td>
            <td>${m.bodega_destino || 'N/A'}</td>
            <td>${m.usuario || 'N/A'}</td>
            <td><span class="tipo-movimiento">${m.tipo_movimiento || 'N/A'}</span></td>
            <td>${m.fecha_movimiento || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}

/* ========= PAGINACIÓN MEJORADA ========= */
function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(movimientosCompletos.length / registrosPorPagina);
    const cont = document.getElementById('controles-paginacion');
    cont.innerHTML = '';

    // Botón Anterior
    if (paginaActual > 1) {
        const btnPrev = document.createElement('button');
        btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i>';
        btnPrev.title = 'Página anterior';
        btnPrev.onclick = () => cambiarPagina(paginaActual - 1);
        cont.appendChild(btnPrev);
    }

    // Botones numéricos con lógica inteligente
    const paginasParaMostrar = obtenerPaginasParaMostrar(paginaActual, totalPaginas);
    
    paginasParaMostrar.forEach(numero => {
        if (numero === '...') {
            const span = document.createElement('span');
            span.textContent = '...';
            span.className = 'puntos-suspensivos';
            cont.appendChild(span);
        } else {
            const btn = document.createElement('button');
            btn.textContent = numero;
            btn.className = numero === paginaActual ? 'active' : '';
            btn.onclick = () => cambiarPagina(numero);
            cont.appendChild(btn);
        }
    });

    // Botón Siguiente
    if (paginaActual < totalPaginas) {
        const btnNext = document.createElement('button');
        btnNext.innerHTML = '<i class="fas fa-chevron-right"></i>';
        btnNext.title = 'Página siguiente';
        btnNext.onclick = () => cambiarPagina(paginaActual + 1);
        cont.appendChild(btnNext);
    }
}

function obtenerPaginasParaMostrar(paginaActual, totalPaginas) {
    const paginas = [];
    const vecindad = 1; // Cuántas páginas mostrar alrededor de la actual
    
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || 
            (i >= paginaActual - vecindad && i <= paginaActual + vecindad)) {
            paginas.push(i);
        } else if (paginas[paginas.length - 1] !== '...') {
            paginas.push('...');
        }
    }
    
    return paginas;
}

function cambiarPagina(nuevaPagina) {
    paginaActual = nuevaPagina;
    actualizarTablaPaginada();
    actualizarControlesPaginacion();
    actualizarInfoPagina();
    scrollToTop();
}

function actualizarInfoPagina() {
    const totalPaginas = Math.ceil(movimientosCompletos.length / registrosPorPagina);
    const inicio = ((paginaActual - 1) * registrosPorPagina) + 1;
    const fin = Math.min(paginaActual * registrosPorPagina, movimientosCompletos.length);
    
    const infoElement = document.getElementById('info-pagina');
    if (infoElement) {
        infoElement.textContent = `Mostrando ${inicio}-${fin} de ${movimientosCompletos.length}`;
    }
}

function actualizarTotalRegistros() {
    const totalElement = document.getElementById('total-registros');
    if (totalElement) {
        totalElement.textContent = `${movimientosCompletos.length} registro${movimientosCompletos.length !== 1 ? 's' : ''} encontrado${movimientosCompletos.length !== 1 ? 's' : ''}`;
    }
}

function scrollToTop() {
    window.scrollTo({
        top: document.querySelector('.table-wrapper').offsetTop - 100,
        behavior: 'smooth'
    });
}

/* ========= FUNCIONES UTILITARIAS ========= */
function formatearFecha(fechaString) {
    if (!fechaString) return 'N/A';
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function mostrarMensaje(texto, tipo = 'info') {
    // Puedes implementar un sistema de notificaciones aquí
    console.log(`${tipo.toUpperCase()}: ${texto}`);
}

/* ========= BODEGAS ========= */
async function cargarBodegas() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('http://192.168.1.13:4000/bode/mostrar', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        const select = document.getElementById('id_bodega');
        select.innerHTML = '<option value="">Todas las bodegas</option>';

        data.data.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id_bodega;
            opt.textContent = b.nombre;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
    }
}

/* ========= EXPORTAR EXCEL ========= */
function exportarExcel() {
    if (movimientosCompletos.length === 0) {
        mostrarMensaje('No hay datos para exportar', 'warning');
        return;
    }

    const datosExportar = movimientosCompletos.map(m => ({
        'Código Barras': m.codigo || '',
        'Código Inteligente': m.observaciones || '',
        'Talla': obtenerTalla(m.codigo),
        'Cantidad': m.cantidad,
        'Bodega Origen': m.bodega_origen || '',
        'Bodega Destino': m.bodega_destino || '',
        'Usuario': m.usuario || '',
        'Tipo Movimiento': m.tipo_movimiento || '',
        'Fecha': formatearFecha(m.fecha_movimiento)
    }));

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `movimientos_bodegas_${fecha}.xlsx`);
}

/* ========= LIMPIAR FILTROS ========= */
function limpiarFiltros() {
    document.getElementById('id_bodega').value = '';
    document.getElementById('codigo_inteligente').value = '';
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha_inicio').value = hoy;
    document.getElementById('fecha_fin').value = hoy;
    
    cargarMovimientos();
}

/* ========= EVENT LISTENERS ========= */
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarBodegas();

    // Establecer fechas por defecto (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha_inicio').value = hoy;
    document.getElementById('fecha_fin').value = hoy;

    // Cargar datos iniciales
    cargarMovimientos();

    // Evento del formulario
    document.getElementById('filtro-fechas').addEventListener('submit', e => {
        e.preventDefault();
        cargarMovimientos(
            document.getElementById('id_bodega').value || null,
            document.getElementById('fecha_inicio').value || null,
            document.getElementById('fecha_fin').value || null,
            document.getElementById('codigo_inteligente').value.trim() || null
        );
    });

    // Evento exportar Excel
    document.getElementById('exportar-excel').addEventListener('click', exportarExcel);

    // Evento limpiar filtros
    document.getElementById('limpiar-filtros').addEventListener('click', limpiarFiltros);

    // Evento cambiar registros por página
    document.getElementById('registros-pagina').addEventListener('change', (e) => {
        registrosPorPagina = parseInt(e.target.value);
        paginaActual = 1;
        actualizarTablaPaginada();
        actualizarControlesPaginacion();
        actualizarInfoPagina();
    });

    // Eventos para los selects del navbar
    document.getElementById('adminUsuario').addEventListener('change', (e) => {
        if (e.target.value) window.location.href = e.target.value;
    });
    
    document.getElementById('bodegas').addEventListener('change', (e) => {
        if (e.target.value) window.location.href = e.target.value;
    });
    
    document.getElementById('historial').addEventListener('change', (e) => {
        if (e.target.value) window.location.href = e.target.value;
    });
});

// Agregar estos estilos adicionales al CSS
const estilosAdicionales = `
    .badge {
        display: inline-block;
        padding: 4px 10px;
        background-color: rgba(19, 48, 46, 0.1);
        border-radius: 12px;
        font-weight: 600;
        color: var(--primary-color);
        font-size: 13px;
        min-width: 30px;
        text-align: center;
    }
    
    .tipo-movimiento {
        padding: 4px 10px;
        background-color: #e3f2fd;
        color: #1976d2;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .no-data {
        text-align: center;
        padding: 50px !important;
        color: var(--text-light);
    }
    
    .no-data i {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.3;
    }
    
    .no-data p {
        font-size: 16px;
        margin-top: 10px;
    }
    
    .puntos-suspensivos {
        display: flex;
        align-items: center;
        padding: 0 5px;
        color: var(--text-light);
    }
`;

// Inyectar estilos adicionales
const styleSheet = document.createElement("style");
styleSheet.textContent = estilosAdicionales;
document.head.appendChild(styleSheet);