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
        // Decodificar el token JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Payload del token:', payload);

        // Asignar los valores a los inputs
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
        // Obtener el ID de la bodega usando la función obtenerIdBodega
        const id_bodega = obtenerIdBodega();

        if (!id_bodega) {
            throw new Error('No se pudo obtener el ID de la bodega');
        }

        console.log("ID de la bodega:", id_bodega); // Log para depuración

        // Hacer la solicitud al backend para obtener los productos de la bodega
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
        console.log("Respuesta completa del backend:", data); // Log para depuración

        // Verifica que la respuesta tenga un campo "body" y que sea un array
        if (!data.body || !Array.isArray(data.body)) {
            console.error("Estructura de la respuesta:", data); // Log para depuración
            throw new Error('La respuesta del backend no contiene un array de productos');
        }

        actualizarTablaProductos(data.body); // Pasar data.body a la función

    } catch (error) {
        console.error('Error al cargar los productos:', error.message);
        alert('No se pudieron cargar los productos. Verifica el servidor.');
    }
}


function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0'); // Los meses van de 0 a 11
    const anio = fecha.getFullYear();
    

    return `${dia}/${mes}/${anio}`;
}

function actualizarTablaProductos(productos) {
    const tbody = document.querySelector('.cont-segun-formu');
    const existingRows = tbody.querySelectorAll('.table-row2');
    existingRows.forEach(row => row.remove());

    productos.forEach(producto => {
        const tr = document.createElement('div');
        tr.classList.add('table-row2');
        tr.innerHTML = `
            <span>${producto.SKU}</span>
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

async function eliminarProducto(event) {
    const ID = event.target.getAttribute('data-id');
    const token = localStorage.getItem('token');

    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    if (!confirm(`¿Estás seguro de eliminar este producto ${ID}?`)) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:4000/product/producto`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_producto: ID }) // Cambia "id" por "id_producto"
        });

        const data = await response.json();
        console.log('Respuesta del backend:', data);

        if (response.ok) {
            alert('Producto eliminado correctamente');
            await cargarProductosDeBodega(); // Recargar la lista de productos
        } else {
            alert('No se pudo eliminar el producto');
            console.error('Error:', data.message || 'No se pudo eliminar el producto');
        }
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        alert('Error al eliminar el producto. Verifica el servidor.');
    }
}


function obtenerIdBodega() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return null;
    }

    try {
        // Decodificar el token JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Payload del token:', payload);

        // Extraer el nombre de la bodega desde el campo "bodega"
        const nombreBodega = payload.bodega || null;

        // Mapear el nombre de la bodega a un ID
        const bodegas = {
            "Corte": 1,
            "Inyeccion": 2, // Asegúrate de que el nombre coincida exactamente
            "Preparada": 3,
            "Montaje": 4,
            "Terminada": 5,
            "Vulcanizado": 6
        };

        // Obtener el ID de la bodega
        const idBodega = bodegas[nombreBodega] || null;

        console.log("Nombre de la bodega:", nombreBodega); // Log para depuración
        console.log("ID de la bodega:", idBodega); // Log para depuración

        return idBodega;

    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}