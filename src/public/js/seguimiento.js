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

        actualizarTablaMovimientos(data.body);
    } catch (error) {
        console.error('Error al cargar los movimientos:', error.message);
        alert(`No se pudo cargar los movimientos. Verifica el servidor. Detalle: ${error.message}`);
    }
}

function actualizarTablaMovimientos(movimientos) {
    const tbody = document.querySelector('#tabla-movimientos tbody');
    tbody.innerHTML = ''; // Limpiar filas existentes

    movimientos.forEach(movimiento => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${movimiento.id_movimiento || 'N/A'}</td>
            <td>${movimiento.producto_codigo || 'N/A'}</td>
            <td>${movimiento.bodega_origen || 'N/A'}</td>
            <td>${movimiento.bodega_destino || 'N/A'}</td>
            <td>${movimiento.usuario_responsable || 'N/A'}</td>
            <td>${movimiento.fecha_movimiento ? new Date(movimiento.fecha_movimiento).toLocaleString() : 'N/A'}</td>
            <td>${movimiento.tipo_movimiento || 'N/A'}</td>
            <td>${movimiento.observaciones || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();

    // Manejar el formulario de filtros
    const form = document.getElementById('filtro-fechas');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fechaInicio = document.getElementById('fecha_inicio').value;
        const fechaFin = document.getElementById('fecha_fin').value;

        // Validar que fecha_fin no sea anterior a fecha_inicio
        if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
            alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }

        cargarMovimientos(fechaInicio, fechaFin);
    });

    // Cargar datos iniciales (sin filtros) si no hay fechas seleccionadas
    cargarMovimientos();
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


redirigir('adminUsuario');
redirigir('bodegas');
redirigir('historial');