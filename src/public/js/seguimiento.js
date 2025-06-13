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

async function cargarMovimientos(fechaInicio = null, fechaFin = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return;
    }

    try {
        let url = 'http://localhost:4000/product/historial';
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);
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
            throw new Error('La respuesta del backend no contiene un array de movimientos');
        }

        // Filter out movements with 'Enviado' status
        const filteredMovimientos = data.body.filter(movimiento => 
            movimiento.tipo_movimiento && movimiento.tipo_movimiento.toLowerCase() !== 'enviado'
        );
        actualizarTablaMovimientos(filteredMovimientos);
    } catch (error) {
        console.error('Error al cargar los movimientos:', error.message);
        alert(`No se pudo cargar los movimientos. Verifica el servidor. Detalle: ${error.message}`);
    }
}

function actualizarTablaMovimientos(movimientos) {
    const tbody = document.querySelector('#tabla-movimientos tbody');
    tbody.innerHTML = ''; // Limpiar filas existentes

    if (movimientos.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="9">No se encontraron movimientos.</td>`;
        tbody.appendChild(tr);
        return;
    }

    movimientos.forEach(movimiento => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${movimiento.id_movimiento || 'N/A'}</td>
            <td>${movimiento.producto_codigo || 'N/A'}</td>
            <td>${movimiento.bodega_origen || 'N/A'}</td>
            <td>${movimiento.bodega_destino || 'N/A'}</td>
            <td>${movimiento.usuario_responsable || 'N/A'}</td>
            <td>${movimiento.cantidad !== undefined ? movimiento.cantidad : 'N/A'}</td>
            <td>${movimiento.tipo_movimiento || 'N/A'}</td>
            <td>${movimiento.observaciones || 'N/A'}</td>
            <td>${movimiento.fecha_movimiento ? new Date(movimiento.fecha_movimiento).toLocaleString() : 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    // Load all movements on page load
    cargarMovimientos();

    // Manejar el formulario de filtros
    const form = document.getElementById('filtro-fechas');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fechaInicio = document.getElementById('fecha_inicio').value;
        const fechaFin = document.getElementById('fecha_fin').value;

        // Validar que fecha_fin no sea anterior a fecha_inicio si ambas están definidas
        if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
            alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }

        // Cargar movimientos con o sin filtros
        cargarMovimientos(fechaInicio || null, fechaFin || null);
    });
});

function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
    selectElement.addEventListener('change', function() {
        const selectedOption = selectElement.options[selectElement.selectedIndex].value;
        if (selectedOption) {
            window.location.href = selectedOption;
        }
    });
}

function exportarAExcel() {
    const rows = document.querySelectorAll('#tabla-movimientos tbody tr');
    if (rows.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear datos para Excel
    const datos = [
        ["ID Movimiento", "Código Producto", "Bodega Origen", "Bodega Destino", "Usuario", "Cantidad", "Tipo", "Observaciones", "Fecha"]
    ];

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        const rowData = Array.from(cols).map(col => col.textContent.trim());
        datos.push(rowData);
    });

    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

    // Generar y descargar archivo Excel
    const fecha = new Date().toISOString().split('T')[0]; // e.g., "2025-06-10"
    XLSX.writeFile(wb, `Movimientos_${fecha}.xlsx`);
}

// ... (rest of the code remains the same)

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarMovimientos();

    // Manejar el formulario de filtros
    const form = document.getElementById('filtro-fechas');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fechaInicio = document.getElementById('fecha_inicio').value;
        const fechaFin = document.getElementById('fecha_fin').value;

        if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
            alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }

        cargarMovimientos(fechaInicio || null, fechaFin || null);
    });

    // Añadir evento para exportar a Excel
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Exportar a Excel';
    exportButton.className = 'export-button';
    exportButton.addEventListener('click', exportarAExcel);
    form.appendChild(exportButton);
});

// Add CSS for the export button
const style = document.createElement('style');
style.textContent = `
    .export-button {
        padding: 6px 15px;
        border: none;
        background-color: #13302e;
        color: white;
        font-size: 14px;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        margin-left: 10px;
    }
    .export-button:hover {
        background-color: #1b4a47;
    }
`;
document.head.appendChild(style);

function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
    selectElement.addEventListener('change', function() {
        const selectedOption = selectElement.options[selectElement.selectedIndex].value;
        if (selectedOption) {
            window.location.href = selectedOption;
        }
    });
}

redirigir('adminUsuario');
redirigir('bodegas');
redirigir('historial');