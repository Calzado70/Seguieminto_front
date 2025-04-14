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
});

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
        document.getElementById('bodega').value = payload.bodega || 'Bodega no disponible';
    } catch (error) {
        console.error('Error al decodificar el token:', error);
    }
}

async function cargarProductosDeBodega() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
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
            throw new Error('Error al cargar los productos');
        }

        const data = await response.json();
        console.log("Respuesta completa del backend:", data);

        if (!data.body || !Array.isArray(data.body)) {
            console.error("Estructura de la respuesta:", data);
            throw new Error('La respuesta del backend no contiene un array de productos');
        }

        actualizarTablaProductos(data.body);
    } catch (error) {
        console.error('Error al cargar los productos:', error.message);
        alert('No se pudieron cargar los productos. Verifica el servidor.');
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
            <span>${producto.SKU}</span>
            <span>${talla}</span> <!-- Mostrar la talla aquí -->
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

// Función para mostrar el modal
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
            "Inyeccion": 2,
            "Preparada": 3,
            "Montaje": 4,
            "Terminada": 5,
            "Vulcanizado": 6
        };
        const idBodega = bodegas[nombreBodega] || null;
        console.log("Nombre de la bodega:", nombreBodega);
        console.log("ID de la bodega:", idBodega);
        return idBodega;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}