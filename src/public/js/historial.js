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

async function cargarHistorial(id_bodega = null, fecha_inicio = null, fecha_fin = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return;
    }

    try {
        let url = 'http://localhost:4000/api/historial';
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
        console.log("Respuesta completa del backend:", data);

        if (!data.body || !Array.isArray(data.body)) {
            console.error("Estructura de la respuesta:", data);
            throw new Error('La respuesta del backend no contiene un array de historial');
        }

        actualizarTablaHistorial(data.body);
    } catch (error) {
        console.error('Error al cargar el historial:', error.message);
        alert(`No se pudo cargar el historial. Verifica el servidor. Detalle: ${error.message}`);
    }
}

function actualizarTablaHistorial(historial) {
    const tbody = document.querySelector('#historialRows');
    tbody.innerHTML = ''; // Limpiar filas existentes

    historial.forEach(item => {
        const tr = document.createElement('div');
        tr.classList.add('table-row2');
        tr.innerHTML = `
            <span>${item.Nombre || 'N/A'}</span>
            <span>${item.SKU || 'N/A'}</span>
            <span>${item.Bodega || ''}</span>
            <span>${item.Bodega_entregada || ''}</span>
            <span>${item.Cantidad !== undefined ? item.Cantidad : 'N/A'}</span>
            <span>${item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}</span>
        `;
        tbody.appendChild(tr);
    });
}

function exportarAExcel() {
    const filas = document.querySelectorAll('#historialRows .table-row2');
    if (filas.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear datos para Excel
    const datos = [
        ["Nombre", "Producto SKU", "Bodega", "Bodega-entregada", "Cantidad", "Fecha"]
    ];

    filas.forEach(fila => {
        const columnas = fila.querySelectorAll('span');
        const datosFila = Array.from(columnas).map(col => col.textContent.trim());
        datos.push(datosFila);
    });

    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");

    // Generar y descargar archivo Excel
    XLSX.writeFile(wb, `Historial_${new Date().toISOString().split('T')[0]}.xlsx`);
}

document.addEventListener('DOMContentLoaded', function() {
    verificarTokenAlCargar();
    // Cargar datos iniciales sin filtros
    cargarHistorial();

    // Aplicar filtros
    document.getElementById('aplicarFiltros').addEventListener('click', () => {
        const id_bodega = document.getElementById('filtroBodega').value || null;
        const fecha_inicio = document.getElementById('filtroFechaInicio').value || null;
        const fecha_fin = document.getElementById('filtroFechaFin').value || null;

        // Validar que fecha_fin no sea anterior a fecha_inicio
        if (fecha_inicio && fecha_fin && new Date(fecha_fin) < new Date(fecha_inicio)) {
            alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }

        cargarHistorial(id_bodega, fecha_inicio, fecha_fin);
    });

    // Exportar a Excel
    document.getElementById('exportarExcel').addEventListener('click', exportarAExcel);

    // Redirigir para los menús desplegables
    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');

    // Botón de alertas
    document.querySelector('.bell').addEventListener('click', irAVistaAlertas);
});