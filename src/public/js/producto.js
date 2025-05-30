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

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarProductosDeBodega();
    cargarUsuarioYBodega();
    
    // Event listener para el botón de mover productos
    document.getElementById('btnMoverProductos').addEventListener('click', moverProductosSeleccionados);

    // Deshabilitar el botón hasta que se seleccione una bodega y un tipo de movimiento
    const bodegaDestinoSelect = document.getElementById('bodegaDestino');
    const tipoMovimientoSelect = document.getElementById('tipoMovimientoSelect');
    const moverButton = document.getElementById('btnMoverProductos');
    moverButton.disabled = true;

    // Habilitar el botón solo si ambos campos tienen un valor válido
    const actualizarEstadoBoton = () => {
        moverButton.disabled = !bodegaDestinoSelect.value || !tipoMovimientoSelect.value;
    };

    bodegaDestinoSelect.addEventListener('change', actualizarEstadoBoton);
    tipoMovimientoSelect.addEventListener('change', actualizarEstadoBoton);
});


const actualizarEstadoBoton = () => {
    console.log('bodegaDestino:', bodegaDestinoSelect.value, 'tipoMovimiento:', tipoMovimientoSelect.value);
    moverButton.disabled = !bodegaDestinoSelect.value || !tipoMovimientoSelect.value;
};


function cargarUsuarioYBodega() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Payload del token:', payload);
        document.getElementById('usuario').value = payload.nombre || 'Usuario no disponible';
        document.getElementById('bodegaActual').value = payload.bodega || 'Bodega no disponible';
    } catch (error) {
        console.error('Error al decodificar el token:', error);
    }
}

async function cargarProductosDeBodega() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    try {
        const id_bodega = obtenerIdBodega();
        if (!id_bodega) {
            throw new Error('No se pudo obtener el ID de la bodega');
        }

        console.log("ID de la bodega:", id_bodega);
        const response = await fetch(`http://localhost:4000/product/producto?id_bodega=${id_bodega}`, {
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
            throw new Error('La respuesta del backend no contiene un array de productos');
        }

        if (data.body.length === 0) {
            console.log("No se encontraron productos para esta bodega.");
            actualizarTablaProductos([]);
            return;
        }

        actualizarTablaProductos(data.body);
    } catch (error) {
        console.error('Error al cargar los productos:', error.message);
        alert(`No se pudieron cargar los productos. Verifica el servidor. Detalle: ${error.message}`);
    }
}

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

function actualizarTablaProductos(productos) {
    const tbody = document.querySelector('.cont-segun-formu');
    const existingRows = tbody.querySelectorAll('.table-row2');
    existingRows.forEach(row => row.remove());

    productos.forEach(producto => {
        const talla = producto.SKU.length >= 2 ? producto.SKU.slice(0, 2) : "N/A";

        const tr = document.createElement('div');
        tr.classList.add('table-row2');
        tr.innerHTML = `
            <span>
                <input type="checkbox" class="producto-checkbox" data-id="${producto.ID}" data-codigo="${producto.SKU}">
            </span>
            <span>${producto.SKU}</span>
            <span>${talla}</span>
            <span>${producto.Bodega}</span>
            <span>${producto.Cantidad}</span>
            <span>${formatearFecha(producto.Fecha)}</span>
            <span class="table-row2-bot" type="button">
                <img src="/img/borrar.png" alt="Borrar" class="borrar" data-id="${producto.ID}">
            </span>
        `;
        tbody.appendChild(tr);
    });

    // Evento para eliminar
    document.querySelectorAll('.borrar').forEach(button => {
        button.addEventListener('click', eliminarProducto);
    });
}

async function moverProductosSeleccionados() {
    const productosSeleccionados = document.querySelectorAll('.producto-checkbox:checked');
    const bodegaDestino = document.getElementById('bodegaDestino').value;
    const tipoMovimiento = document.getElementById('tipoMovimientoSelect').value;

    if (productosSeleccionados.length === 0) {
        alert('Por favor, selecciona al menos un producto para mover.');
        return;
    }

    if (!bodegaDestino) {
        alert('Por favor, selecciona una bodega de destino.');
        return;
    }

    if (!tipoMovimiento) {
        alert('Por favor, selecciona el tipo de movimiento.');
        return;
    }

    const nombresProductos = Array.from(productosSeleccionados).map(cb => cb.dataset.codigo).join(', ');
    const bodegaOrigenNombre = document.getElementById('bodegaActual').value;
    const bodegaDestinoNombre = obtenerNombreBodega(bodegaDestino);

    document.getElementById('productoMovimiento').textContent = nombresProductos;
    document.getElementById('bodegaOrigen').textContent = bodegaOrigenNombre;
    document.getElementById('bodegaDestinoSpan').textContent = bodegaDestinoNombre;
    document.getElementById('tipoMovimiento').textContent = tipoMovimiento;

    const modal = document.getElementById('modalMovimiento');
    modal.style.display = 'flex';

    const confirmarBtn = document.getElementById('confirmarMovimiento');
    const cancelarBtn = document.getElementById('cancelarMovimiento');

    const confirmarHandler = async () => {
        const observaciones = document.getElementById('observaciones').value.trim();
        modal.style.display = 'none';
        
        await ejecutarMovimientoProductos(productosSeleccionados, bodegaDestino, tipoMovimiento, observaciones);
        
        confirmarBtn.removeEventListener('click', confirmarHandler);
        cancelarBtn.removeEventListener('click', cancelarHandler);
    };

    const cancelarHandler = () => {
        modal.style.display = 'none';
        confirmarBtn.removeEventListener('click', confirmarHandler);
        cancelarBtn.removeEventListener('click', cancelarHandler);
    };

    confirmarBtn.addEventListener('click', confirmarHandler);
    cancelarBtn.addEventListener('click', cancelarHandler);
}

async function ejecutarMovimientoProductos(productosSeleccionados, bodegaDestino, tipoMovimiento, observaciones) {
    const token = localStorage.getItem('token');
    const bodegaOrigen = obtenerIdBodega();
    const usuarioId = obtenerIdUsuario();

    if (!token || !bodegaOrigen || !usuarioId) {
        alert('Error en los datos de sesión. Por favor, inicia sesión nuevamente.');
        return;
    }

    try {
        const movimientos = Array.from(productosSeleccionados).map(checkbox => ({
            id_producto: parseInt(checkbox.dataset.id),
            id_bodega_origen: bodegaOrigen,
            id_bodega_destino: parseInt(bodegaDestino),
            usuario_responsable: usuarioId,
            tipo_movimiento: tipoMovimiento,
            observaciones: observaciones || ''
        }));

        console.log('Datos a enviar:', movimientos);
        console.log('Enviando solicitud a:', 'http://localhost:4000/product/registrar');

        const response = await fetch('http://localhost:4000/product/registrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ movimientos })
        });

        console.log('Respuesta del servidor:', response.status, response.statusText);
        const data = await response.json();
        console.log('Datos de respuesta:', data);


        if (response.ok) {
            alert(`${movimientos.length} producto(s) movido(s) correctamente.`);
            document.getElementById('bodegaDestino').value = '';
            document.getElementById('tipoMovimientoSelect').value = '';
            document.getElementById('observaciones').value = '';
            await cargarProductosDeBodega();
        } else {
            throw new Error(data.message || 'Error al mover los productos');
        }
    } catch (error) {
        console.error('Error al mover productos:', error);
        alert('Error al mover los productos: ' + error.message);
    }
}

// Función para mostrar el modal de contraseña
function mostrarModalContrasena() {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('modalConfirmarContrasena');
        const inputContrasena = document.getElementById('inputContrasena');
        const confirmarButton = document.getElementById('confirmarEliminacion');
        const cancelarButton = document.getElementById('cancelarEliminacion');

        modal.style.display = 'flex';
        inputContrasena.value = '';

        const confirmarHandler = () => {
            const contrasena = inputContrasena.value.trim();
            if (contrasena) {
                modal.style.display = 'none';
                resolve(contrasena);
            } else {
                alert('Por favor, ingresa una contraseña.');
            }
        };

        const cancelarHandler = () => {
            modal.style.display = 'none';
            reject(new Error('Eliminación cancelada.'));
        };

        confirmarButton.addEventListener('click', confirmarHandler);
        cancelarButton.addEventListener('click', cancelarHandler);

        inputContrasena.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmarHandler();
            }
        });
    });
}

async function eliminarProducto(event) {
    const ID = event.target.getAttribute('data-id');
    const token = localStorage.getItem('token');

    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    try {
        const contrasena = await mostrarModalContrasena();

        const response = await fetch(`http://localhost:4000/product/producto`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id_producto: ID,
                contrasena: contrasena
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Producto eliminado correctamente');
            await cargarProductosDeBodega();
        } else {
            throw new Error(data.message || "Error al eliminar el producto");
        }
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        if (error.message !== 'Eliminación cancelada.') {
            alert(error.message || 'Error al eliminar el producto');
        }
    }
}

function obtenerIdBodega() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return null;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Payload del token:', payload);
        const nombreBodega = payload.bodega || null;
        const bodegas = {
            "Corte": 1,
            "Inyección": 2,
            "Preparada": 3,
            "Montaje": 4,
            "Terminada": 5,
            "Vulcanizado": 6
        };
        const idBodega = bodegas[nombreBodega] || null;
        console.log("Nombre de la bodega:", nombreBodega, "ID de la bodega:", idBodega);
        if (!idBodega) {
            console.error('Bodega no reconocida o no proporcionada en el token');
        }
        return idBodega;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}

function obtenerIdUsuario() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return null;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.user_id || null;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}

function obtenerNombreBodega(idBodega) {
    const bodegas = {
        "1": "Corte",
        "2": "Inyección",
        "3": "Preparada",
        "4": "Montaje",
        "5": "Terminada",
        "6": "Vulcanizado"
    };
    return bodegas[idBodega] || "Desconocida";
}