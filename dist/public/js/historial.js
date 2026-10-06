// Variables globales para paginación
let historialCompleto = [];
let paginaActual = 1;
const registrosPorPagina = 10;
function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    selectElement.addEventListener('change', function() {
        const selectedOption = selectElement.options[selectElement.selectedIndex].value;
        if (selectedOption) {
            window.location.href = selectedOption;
        }
    });
}

async function cargarHistorial() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return;
    }

    try {
        const data = await apiFetch('/hist/historial', {
            method: 'GET'
        });

        if (!data.body || !Array.isArray(data.body)) {
            console.error("Estructura de la respuesta:", data);
            throw new Error('La respuesta del backend no contiene un array de historial');
        }

        historialCompleto = data.body;
        paginaActual = 1;
        mostrarPaginaActual();
        crearControlesPaginacion();
        
    } catch (error) {
        console.error('Error al cargar el historial:', error.message);
        toast(`No se pudo cargar el historial. Verifica el servidor. Detalle: ${error.message}`, "error");
    }
}

function mostrarPaginaActual() {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const datosPagina = historialCompleto.slice(inicio, fin);
    actualizarTablaHistorial(datosPagina);
}

function actualizarTablaHistorial(historial) {
    const tbody = document.querySelector('#historialRows');
    tbody.innerHTML = '';

    if (historial.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No se encontraron registros.';
        tbody.appendChild(noResults);
        return;
    }

    historial.forEach(item => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div class="table-cell">${escapeHtml(item.Bodega || 'N/A')}</div>
            <div class="table-cell">${escapeHtml(item.Codigo || 'N/A')}</div>
            <div class="table-cell">${escapeHtml(item.caracteristica || '')}</div>
            <div class="table-cell">${escapeHtml(item.Usuario || '')}</div>
            <div class="table-cell">${item.cantidad_anterior !== undefined ? item.cantidad_anterior : 'N/A'}</div>
            <div class="table-cell">${item.cantidad_nueva !== undefined ? item.cantidad_nueva : 'N/A'}</div>
            <div class="table-cell">${item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}</div>
        `;
        tbody.appendChild(row);
    });
}

function crearControlesPaginacion() {
    const totalPaginas = Math.ceil(historialCompleto.length / registrosPorPagina);
    
    const controlesExistentes = document.querySelector('.pagination-controls');
    if (controlesExistentes) controlesExistentes.remove();
    
    const controles = document.createElement('div');
    controles.className = 'pagination-controls';
    
    const inicio = (paginaActual - 1) * registrosPorPagina + 1;
    const fin = Math.min(paginaActual * registrosPorPagina, historialCompleto.length);
    
    controles.innerHTML = `
        <div class="pagination-info">
            Mostrando ${inicio}-${fin} de ${historialCompleto.length} registros
        </div>
        <div class="pagination-buttons">
            <button class="pagination-button" id="btnPrimera" ${paginaActual === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button class="pagination-button" id="btnAnterior" ${paginaActual === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-left"></i>
            </button>
            <span class="current-page">Página ${paginaActual} de ${totalPaginas}</span>
            <button class="pagination-button" id="btnSiguiente" ${paginaActual === totalPaginas ? 'disabled' : ''}>
                <i class="fas fa-angle-right"></i>
            </button>
            <button class="pagination-button" id="btnUltima" ${paginaActual === totalPaginas ? 'disabled' : ''}>
                <i class="fas fa-angle-double-right"></i>
            </button>
        </div>
    `;
    
    // Por id y no por clase: la vista tiene ahora dos contenedores
    // (movimientos y auditoría) y el selector por clase añadiría los
    // controles de paginación al panel equivocado.
    document.getElementById('historialContainer').appendChild(controles);
    
    document.getElementById('btnPrimera').addEventListener('click', () => cambiarPagina(1));
    document.getElementById('btnAnterior').addEventListener('click', () => cambiarPagina(paginaActual - 1));
    document.getElementById('btnSiguiente').addEventListener('click', () => cambiarPagina(paginaActual + 1));
    document.getElementById('btnUltima').addEventListener('click', () => cambiarPagina(totalPaginas));
}

function cambiarPagina(nuevaPagina) {
    const totalPaginas = Math.ceil(historialCompleto.length / registrosPorPagina);
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        mostrarPaginaActual();
        crearControlesPaginacion();
    }
}

async function exportarAExcel() {
    if (historialCompleto.length === 0) {
        toast('No hay datos para exportar', 'warning');
        return;
    }

    const datos = [
        ["Bodega", "Código", "Característica", "Usuario", "Cantidad Anterior", "Cantidad Nueva", "Fecha"]
    ];

    historialCompleto.forEach(item => {
        datos.push([
            item.Bodega || 'N/A',
            item.Codigo || 'N/A',
            item.caracteristica || '',
            item.Usuario || '',
            item.cantidad_anterior !== undefined ? item.cantidad_anterior : 'N/A',
            item.cantidad_nueva !== undefined ? item.cantidad_nueva : 'N/A',
            item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'
        ]);
    });

    try {
        await exportarXlsx({
            filas: datos,
            tipo: 'aoa',
            hoja: 'Historial',
            archivo: `Historial_${new Date().toISOString().split('T')[0]}.xlsx`,
        });
    } catch (error) {
        toast(error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    verificarTokenAlCargar();
    cargarHistorial();

    document.getElementById('exportarExcel').addEventListener('click', function() {
        // Si la pestaña de auditoría está activa, ese panel exporta él mismo.
        if (typeof exportarAuditoriaSiActiva === 'function' && exportarAuditoriaSiActiva()) {
            return;
        }
        exportarAExcel();
    });

    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');
    redirigir('productos');
});