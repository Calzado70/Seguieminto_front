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
        movimientosCompletos = data.body.filter(movimiento => 
            movimiento.tipo_movimiento && movimiento.tipo_movimiento.toLowerCase() !== 'enviado'
        );
        
        paginaActual = 1; // Resetear a la primera página
        actualizarTablaPaginada();
        actualizarControlesPaginacion();
        
    } catch (error) {
        console.error('Error al cargar los movimientos:', error.message);
        alert(`No se pudo cargar los movimientos. Verifica el servidor. Detalle: ${error.message}`);
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

    // Calcular índices para la página actual
    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const indiceFin = indiceInicio + registrosPorPagina;
    const movimientosPagina = movimientosCompletos.slice(indiceInicio, indiceFin);

    movimientosPagina.forEach(movimiento => {
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

function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(movimientosCompletos.length / registrosPorPagina);
    const controlesPaginacion = document.getElementById('controles-paginacion');
    
    if (!controlesPaginacion) {
        crearControlesPaginacion();
        return;
    }

    controlesPaginacion.innerHTML = '';

    // Información de página actual
    const infoPagina = document.createElement('span');
    infoPagina.className = 'info-pagina';
    infoPagina.textContent = `Página ${paginaActual} de ${totalPaginas} (${movimientosCompletos.length} registros total)`;
    controlesPaginacion.appendChild(infoPagina);

    // Contenedor de botones
    const contenedorBotones = document.createElement('div');
    contenedorBotones.className = 'botones-paginacion';

    // Botón anterior
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

    // Botones de números de página
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
            puntos.className = 'puntos-suspensivos';
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
            puntos.className = 'puntos-suspensivos';
            contenedorBotones.appendChild(puntos);
        }

        const btnUltimo = document.createElement('button');
        btnUltimo.textContent = totalPaginas;
        btnUltimo.className = 'btn-paginacion';
        btnUltimo.onclick = () => irAPagina(totalPaginas);
        contenedorBotones.appendChild(btnUltimo);
    }

    // Botón siguiente
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
    actualizarControlesPaginacion();
}

function exportarAExcel() {
    if (movimientosCompletos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear datos para Excel usando todos los movimientos, no solo los de la página actual
    const datos = [
        ["ID Movimiento", "Código Producto", "Bodega Origen", "Bodega Destino", "Usuario", "Cantidad", "Tipo", "Observaciones", "Fecha"]
    ];

    movimientosCompletos.forEach(movimiento => {
        const rowData = [
            movimiento.id_movimiento || 'N/A',
            movimiento.producto_codigo || 'N/A',
            movimiento.bodega_origen || 'N/A',
            movimiento.bodega_destino || 'N/A',
            movimiento.usuario_responsable || 'N/A',
            movimiento.cantidad !== undefined ? movimiento.cantidad : 'N/A',
            movimiento.tipo_movimiento || 'N/A',
            movimiento.observaciones || 'N/A',
            movimiento.fecha_movimiento ? new Date(movimiento.fecha_movimiento).toLocaleString() : 'N/A'
        ];
        datos.push(rowData);
    });

    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

    // Generar y descargar archivo Excel
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Movimientos_${fecha}.xlsx`);
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

    // Configurar redirecciones
    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');
});