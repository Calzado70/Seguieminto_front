// Variables globales para paginación
let historialCompletoEnviado = [];
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

function irAVistaAlertas() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }
    window.location.href = '/alerta';
}

async function cargarHistorialEnviado(id_bodega = null, fecha_inicio = null, fecha_fin = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return;
    }

    try {
        let url = 'http://localhost:4000/api/logistica';
        const params = new URLSearchParams();
        if (id_bodega) params.append('id_bodega', id_bodega);
        if (fecha_inicio) params.append('fecha_inicio', fecha_inicio);
        if (fecha_fin) params.append('fecha_fin', fecha_fin);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta del servidor: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        // Temporary fallback: Use data directly if body is missing
        const historial = Array.isArray(data.body) ? data.body : (data.respuesta === 'Bienvenido' ? [] : []);
        if (historial.length === 0 && data.respuesta === 'Bienvenido') {
            console.warn('Respuesta de bienvenida recibida, asumiendo sin datos.');
        }
        if (!Array.isArray(historial)) {
            console.error("Estructura de la respuesta:", data);
            throw new Error('La respuesta del backend no contiene un array de historial');
        }

        // Guardar datos completos y resetear paginación
        historialCompletoEnviado = historial;
        paginaActual = 1;
        
        // Mostrar datos paginados
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
    const datosPagina = historialCompletoEnviado.slice(inicio, fin);
    
    actualizarTablaHistorial(datosPagina);
}

function actualizarTablaHistorial(historial) {
    const tbody = document.querySelector('#historialRows');
    tbody.innerHTML = ''; // Limpiar filas existentes

    if (historial.length === 0) {
        const tr = document.createElement('div');
        tr.classList.add('table-row2');
        tr.innerHTML = `<span colspan="7">No se encontraron registros.</span>`;
        tbody.appendChild(tr);
        return;
    }

    historial.forEach(item => {
        const tr = document.createElement('div');
        tr.classList.add('table-row2');
        tr.innerHTML = `
            <span>${item.Nombre || 'N/A'}</span>
            <span>${item.Producto_SKU || 'N/A'}</span>
            <span>${item.Bodega || ''}</span>
            <span>${item.Bodega_entregada || ''}</span>
            <span>${item.Cantidad !== undefined ? item.Cantidad : 'N/A'}</span>
            <span>${item.Tipo || 'N/A'}</span>
            <span>${item.Fecha ? new Date(item.Fecha).toLocaleDateString() : 'N/A'}</span>
        `;
        tbody.appendChild(tr);
    });
}

function crearControlesPaginacion() {
    const totalPaginas = Math.ceil(historialCompletoEnviado.length / registrosPorPagina);
    
    // Eliminar controles existentes si los hay
    const controlesExistentes = document.querySelector('.controles-paginacion');
    if (controlesExistentes) {
        controlesExistentes.remove();
    }
    
    // No crear controles si no hay datos
    if (historialCompletoEnviado.length === 0) {
        return;
    }
    
    // Crear nuevo contenedor de controles
    const controles = document.createElement('div');
    controles.className = 'controles-paginacion';
    
    // Información de registros
    const inicio = (paginaActual - 1) * registrosPorPagina + 1;
    const fin = Math.min(paginaActual * registrosPorPagina, historialCompletoEnviado.length);
    
    controles.innerHTML = `
        <div class="info-paginacion">
            Mostrando ${inicio}-${fin} de ${historialCompletoEnviado.length} registros
        </div>
        <div class="botones-paginacion">
            <button class="btn-paginacion" id="btnPrimera" ${paginaActual === 1 ? 'disabled' : ''}>
                ««
            </button>
            <button class="btn-paginacion" id="btnAnterior" ${paginaActual === 1 ? 'disabled' : ''}>
                ‹
            </button>
            <span class="pagina-actual">Página ${paginaActual} de ${totalPaginas}</span>
            <button class="btn-paginacion" id="btnSiguiente" ${paginaActual === totalPaginas ? 'disabled' : ''}>
                ›
            </button>
            <button class="btn-paginacion" id="btnUltima" ${paginaActual === totalPaginas ? 'disabled' : ''}>
                »»
            </button>
        </div>
    `;
    
    // Insertar controles después de la tabla
    const contenedorTabla = document.querySelector('.cont-segun-formu');
    contenedorTabla.appendChild(controles);
    
    // Agregar event listeners
    document.getElementById('btnPrimera').addEventListener('click', () => cambiarPagina(1));
    document.getElementById('btnAnterior').addEventListener('click', () => cambiarPagina(paginaActual - 1));
    document.getElementById('btnSiguiente').addEventListener('click', () => cambiarPagina(paginaActual + 1));
    document.getElementById('btnUltima').addEventListener('click', () => cambiarPagina(totalPaginas));
}

function cambiarPagina(nuevaPagina) {
    const totalPaginas = Math.ceil(historialCompletoEnviado.length / registrosPorPagina);
    
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        mostrarPaginaActual();
        crearControlesPaginacion();
    }
}

function exportarAExcel() {
    // Exportar todos los datos, no solo la página actual
    if (historialCompletoEnviado.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear datos para Excel
    const datos = [
        ["Nombre", "Producto SKU", "Bodega", "Bodega-entregada", "Cantidad", "Tipo", "Fecha"]
    ];

    historialCompletoEnviado.forEach(item => {
        const datosFila = [
            item.Nombre || 'N/A',
            item.Producto_SKU || 'N/A',
            item.Bodega || '',
            item.Bodega_entregada || '',
            item.Cantidad !== undefined ? item.Cantidad : 'N/A',
            item.Tipo || 'N/A',
            item.Fecha ? new Date(item.Fecha).toLocaleDateString() : 'N/A'
        ];
        datos.push(datosFila);
    });

    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HistorialEnviado");

    // Generar y descargar archivo Excel
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `HistorialEnviado_${fecha}.xlsx`);
}

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarHistorialEnviado(); // Load 'Enviado' history on page load

    // Aplicar filtros
    document.getElementById('aplicarFiltros').addEventListener('click', () => {
        const fecha_inicio = document.getElementById('filtroFechaInicio').value || null;
        const fecha_fin = document.getElementById('filtroFechaFin').value || null;

        // Validar que fecha_fin no sea anterior a fecha_inicio
        if (fecha_inicio && fecha_fin && new Date(fecha_fin) < new Date(fecha_inicio)) {
            alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }

        cargarHistorialEnviado(null, fecha_inicio, fecha_fin);
    });

    // Exportar a Excel
    document.getElementById('exportarExcel').addEventListener('click', exportarAExcel);

    // Redirigir para los menús desplegables
    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');
});