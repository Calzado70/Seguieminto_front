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

let productosScaneados = [];

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarUsuarioYBodega();
    document.getElementById('codigo').addEventListener('change', manejarEscaneo);
    document.querySelector('.button').addEventListener('click', notificarProductos);
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

function manejarEscaneo(event) {
    const codigo = event.target.value;
    if (!codigo) return;

    const productoExistente = productosScaneados.find(p => p.codigo === codigo);
    if (productoExistente) {
        productoExistente.cantidad += 1;
    } else {
        productosScaneados.push({
            codigo: codigo,
            cantidad: 1,
            fecha: new Date().toISOString()
        });
    }

    actualizarTablaProductos(productosScaneados);
    event.target.value = ''; // Limpiar el input después del escaneo
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
            <span>${producto.codigo}</span>
            <span>${document.getElementById('bodega').value}</span>
            <span>${producto.cantidad}</span>
            <span>${formatearFecha(producto.fecha)}</span>
        `;
        tbody.appendChild(tr);
    });
}

async function notificarProductos() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    const id_bodega = obtenerIdBodega(); // Obtén el ID de la bodega
    const idusuario = obtenerIdUsuario(); // Obtén el ID del usuario

    console.log("ID de bodega:", id_bodega); // Log para depuración
    console.log("ID de usuario:", idusuario); // Log para depuración


    if (!id_bodega || !idusuario || productosScaneados.length === 0) {
        alert('No hay productos para notificar o falta información de bodega/usuario.');
        return;
    }

    try {
        const response = await fetch('http://localhost:4000/product/producto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id_bodega: id_bodega,
                idusuario: idusuario,
                productos: productosScaneados
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error del servidor: ${response.status} - ${errorData.message}`);
        }

        const data = await response.json();
        console.log("Respuesta del backend:", data);
        alert('Productos notificados correctamente');

        // Limpiar la lista de productos escaneados
        productosScaneados = [];
        actualizarTablaProductos(productosScaneados);

    } catch (error) {
        console.error('Error al notificar productos:', error.message);
        alert('No se pudieron notificar los productos. Verifica el servidor.');
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

function obtenerIdUsuario() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return null;
    }

    try {
        // Decodificar el token JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Payload del token:', payload);

        // Extraer el ID del usuario desde el campo "id"
        return payload.id || null; // Cambia "id_usuario" por "id"

    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}

// Cargar productos cuando la página se cargue
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
});