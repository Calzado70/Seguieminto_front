// Variables globales para paginación
let historialCompleto = [];
let paginaActual = 1;
const registrosPorPagina = 10;

function verificarTokenAlCargar() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiracion = payload.exp * 1000;
        if (Date.now() >= expiracion) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error al verificar el token:', error);
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
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
        const response = await fetch('http://localhost:4000/hist/historial', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta del servidor: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Respuesta completa del backend:", data);

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
        alert(`No se pudo cargar el historial. Verifica el servidor. Detalle: ${error.message}`);
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
            <div class="table-cell">${item.Bodega || 'N/A'}</div>
            <div class="table-cell">${item.Codigo || 'N/A'}</div>
            <div class="table-cell">${item.caracteristica || ''}</div>
            <div class="table-cell">${item.Usuario || ''}</div>
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
    
    document.querySelector('.history-container').appendChild(controles);
    
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

function exportarAExcel() {
    if (historialCompleto.length === 0) {
        alert('No hay datos para exportar');
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

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Historial_${new Date().toISOString().split('T')[0]}.xlsx`);
}

document.addEventListener('DOMContentLoaded', function() {
    verificarTokenAlCargar();
    cargarHistorial();

    document.getElementById('exportarExcel').addEventListener('click', exportarAExcel);

    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');
});