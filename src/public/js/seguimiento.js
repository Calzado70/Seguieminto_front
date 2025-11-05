let movimientosCompletos = [];
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

async function cargarMovimientos(idBodega = null, fechaInicio = null, fechaFin = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return;
    }

    try {
        let url = 'http://192.168.1.13:4000/product/movi';
        const params = new URLSearchParams();

        // Solo agregamos parámetros si no están vacíos
        if (idBodega) params.append('id_bodega', idBodega);
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta del servidor: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Respuesta completa del backend:", data);

        if (!data.body || !Array.isArray(data.body)) {
            throw new Error('La respuesta del backend no contiene un array de movimientos');
        }

        // Aquí no filtramos, mostramos todos los movimientos que lleguen
        movimientosCompletos = data.body;

        paginaActual = 1;
        actualizarTablaPaginada();
        actualizarControlesPaginacion();

    } catch (error) {
        console.error('Error al cargar los movimientos:', error.message);
        alert(`No se pudo cargar los movimientos. Detalle: ${error.message}`);
    }
}

function actualizarTablaPaginada() {
    const tbody = document.querySelector('#tabla-movimientos tbody');
    tbody.innerHTML = '';

    if (movimientosCompletos.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="9">No se encontraron movimientos.</td>`;
        tbody.appendChild(tr);
        return;
    }

    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const indiceFin = indiceInicio + registrosPorPagina;
    const movimientosPagina = movimientosCompletos.slice(indiceInicio, indiceFin);

    movimientosPagina.forEach(movimiento => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${movimiento.id_movimiento || 'N/A'}</td>
            <td>${movimiento.codigo || 'N/A'}</td>
            <td>${movimiento.bodega_destino || 'N/A'}</td>
            <td>${movimiento.bodega_origen || 'N/A'}</td>
            <td>${movimiento.usuario || 'N/A'}</td>
            <td>${movimiento.cantidad !== undefined ? movimiento.cantidad : 'N/A'}</td>
            <td>${movimiento.tipo_movimiento || 'N/A'}</td>
            <td>${movimiento.observaciones || 'N/A'}</td>
            <td>${movimiento.fecha_movimiento || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(movimientosCompletos.length / registrosPorPagina);
    const controlesPaginacion = document.getElementById('controles-paginacion') || crearControlesPaginacion();

    controlesPaginacion.innerHTML = '';

    const infoPagina = document.createElement('span');
    infoPagina.className = 'info-pagina';
    infoPagina.textContent = `Página ${paginaActual} de ${totalPaginas} (${movimientosCompletos.length} registros total)`;
    controlesPaginacion.appendChild(infoPagina);

    const contenedorBotones = document.createElement('div');
    contenedorBotones.className = 'botones-paginacion';

    const btnAnterior = document.createElement('button');
    btnAnterior.textContent = '« Anterior';
    btnAnterior.className = 'btn-paginacion';
    btnAnterior.disabled = paginaActual === 1;
    btnAnterior.onclick = () => {
        if (paginaActual > 1) {
            paginaActual--;
            actualizarTablaPaginada();
            actualizarControlesPaginacion();
        }
    };
    contenedorBotones.appendChild(btnAnterior);

    const inicioRango = Math.max(1, paginaActual - 2);
    const finRango = Math.min(totalPaginas, paginaActual + 2);

    if (inicioRango > 1) {
        const btn1 = document.createElement('button');
        btn1.textContent = '1';
        btn1.className = 'btn-paginacion';
        btn1.onclick = () => irAPagina(1);
        contenedorBotones.appendChild(btn1);

        if (inicioRango > 2) {
            const puntos = document.createElement('span');
            puntos.textContent = '...';
            contenedorBotones.appendChild(puntos);
        }
    }

    for (let i = inicioRango; i <= finRango; i++) {
        const btnPagina = document.createElement('button');
        btnPagina.textContent = i;
        btnPagina.className = `btn-paginacion ${i === paginaActual ? 'activo' : ''}`;
        btnPagina.onclick = () => irAPagina(i);
        contenedorBotones.appendChild(btnPagina);
    }

    if (finRango < totalPaginas) {
        if (finRango < totalPaginas - 1) {
            const puntos = document.createElement('span');
            puntos.textContent = '...';
            contenedorBotones.appendChild(puntos);
        }

        const btnUltimo = document.createElement('button');
        btnUltimo.textContent = totalPaginas;
        btnUltimo.className = 'btn-paginacion';
        btnUltimo.onclick = () => irAPagina(totalPaginas);
        contenedorBotones.appendChild(btnUltimo);
    }

    const btnSiguiente = document.createElement('button');
    btnSiguiente.textContent = 'Siguiente »';
    btnSiguiente.className = 'btn-paginacion';
    btnSiguiente.disabled = paginaActual === totalPaginas;
    btnSiguiente.onclick = () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            actualizarTablaPaginada();
            actualizarControlesPaginacion();
        }
    };
    contenedorBotones.appendChild(btnSiguiente);

    controlesPaginacion.appendChild(contenedorBotones);
}

function irAPagina(numeroPagina) {
    paginaActual = numeroPagina;
    actualizarTablaPaginada();
    actualizarControlesPaginacion();
}

function crearControlesPaginacion() {
    const tableContainer = document.querySelector('.table-container');
    const controlesPaginacion = document.createElement('div');
    controlesPaginacion.id = 'controles-paginacion';
    controlesPaginacion.className = 'controles-paginacion';
    tableContainer.appendChild(controlesPaginacion);
    return controlesPaginacion;
}

function exportarAExcel() {
    if (movimientosCompletos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const datos = [
        ["ID Movimiento", "Código Producto", "Bodega Origen", "Bodega Destino", "Usuario", "Cantidad", "Tipo", "Observaciones", "Fecha"]
    ];

    movimientosCompletos.forEach(movimiento => {
        datos.push([
            movimiento.id_movimiento || 'N/A',
            movimiento.codigo || 'N/A',
            movimiento.bodega_destino || 'N/A',
            movimiento.bodega_origen || 'N/A',
            movimiento.usuario || 'N/A',
            movimiento.cantidad !== undefined ? movimiento.cantidad : 'N/A',
            movimiento.tipo_movimiento || 'N/A',
            movimiento.observaciones || 'N/A',
            movimiento.fecha_movimiento || 'N/A'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Movimientos_${fecha}.xlsx`);
}

function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
    selectElement.addEventListener('change', function() {
        const selectedOption = selectElement.value;
        if (selectedOption) {
            window.location.href = selectedOption;
        }
    });
}

// Cargar bodegas desde la API
async function cargarBodegas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://192.168.1.13:4000/bode/mostrar', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Error al cargar bodegas');
        
        const data = await response.json();
        const selectBodega = document.getElementById('id_bodega');
        
        // Limpiar select excepto la primera opción
        selectBodega.innerHTML = '<option value="">Seleccione bodega</option>';
        
        if (data.success && Array.isArray(data.data)) {
            data.data.forEach(bodega => {
                const option = document.createElement('option');
                option.value = bodega.id_bodega;
                option.textContent = bodega.nombre;
                selectBodega.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
        showToast('Error al cargar bodegas', 'error');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarBodegas();

    // Cargar todos los movimientos al iniciar
    cargarMovimientos();

    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha_inicio').value = hoy;
    document.getElementById('fecha_fin').value = hoy;

    const form = document.getElementById('filtro-fechas');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const idBodega = document.getElementById('bodega').value;
        const fechaInicio = document.getElementById('fecha_inicio').value;
        const fechaFin = document.getElementById('fecha_fin').value;

        if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
            alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }

        // Si no hay filtros, mostramos todos los movimientos
        cargarMovimientos(idBodega || null, fechaInicio || null, fechaFin || null);
    });

    const exportButton = document.createElement('button');
    exportButton.textContent = 'Exportar a Excel';
    exportButton.className = 'export-button';
    exportButton.addEventListener('click', exportarAExcel);
    form.appendChild(exportButton);

    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');
});



