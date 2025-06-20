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
let nombreActual = ""; // Opcional, solo si necesitas persistir un nombre

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarUsuarioYBodega();
    document.getElementById('codigo').addEventListener('change', manejarEscaneo);
    document.querySelector('.button').addEventListener('click', notificarProductos);
});

// Obtener área desde el token
function obtenerAreaDesdeToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.bodega || null; // Asumimos que 'bodega' contiene el área
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}

// Función para filtrar códigos por área (igual que en Android)
function filtrarCodigoPorArea(codigo, area, posicionInicial = 4, posicionFinal = 10) {
    // Obtener solo la parte del código que queremos procesar
    const parteProcesar = codigo.substring(posicionInicial, posicionFinal);
    const parteAnterior = codigo.substring(0, posicionInicial);
    const partePosterior = codigo.substring(posicionFinal);
    
    let letrasArea = "";
    switch (area) {
        case "Corte":
            letrasArea = "C";
            break;
        case "Montaje":
            letrasArea = "M";
            break;
        case "Inyeccion":
            letrasArea = "I";
            break;
        case "Cementada":
            letrasArea = "E";
            break;
        case "Vulcanizada":
            letrasArea = "V";
            break;
        case "Terminada":
            letrasArea = "T";
            break;
        default:
            return codigo;
    }
    
    let codigoFiltrado = "";
    for (let c of parteProcesar) {
        if (letrasArea.includes(c) || !"CMIEVT".includes(c)) {
            codigoFiltrado += c;
        }
    }
    
    // Devolver el código completo con la parte filtrada
    return parteAnterior + codigoFiltrado + partePosterior;
}

// Procesar la lectura del código
function manejarEscaneo(event) {
    const codigo = event.target.value.trim();
    const area = obtenerAreaDesdeToken();

    // Validaciones básicas
    if (!codigo || !area) {
        alert("Falta el código o el área no está disponible.");
        return;
    }

    if (codigo.length < 10) {
        alert("El código debe tener al menos 10 dígitos.");
        event.target.value = "";
        return;
    }

    // Filtrar el código según el área
    const codigoFiltrado = filtrarCodigoPorArea(codigo, area);

    // Obtener fecha y talla
    const fecha = new Date().toISOString();
    // const talla = codigoFiltrado.length >= 2 ? codigoFiltrado.slice(0, 2) : "N/A"; // Extraer talla

    // Verificar si el producto ya existe
    const productoExistente = productosScaneados.find(p => p.codigo === codigoFiltrado);
    if (productoExistente) {
        productoExistente.cantidad += 1;
    } else {
        productosScaneados.push({
            codigo: codigoFiltrado,
            cantidad: 1,
            fecha: fecha,
            // talla: talla, // Agregar talla al objeto
            area: area
        });
    }

    // Actualizar la interfaz
    actualizarTablaProductos(productosScaneados);
    event.target.value = ""; // Limpiar el input del código
}

// <span>${producto.talla}</span> <!-- Mostrar la talla -->
// Actualizar la tabla
function actualizarTablaProductos(productos) {
    const tbody = document.querySelector('.cont-segun-formu');
    const existingRows = tbody.querySelectorAll('.table-row2');
    existingRows.forEach(row => row.remove());

    productos.forEach(producto => {
        const tr = document.createElement('div');
        tr.classList.add('table-row2');
        tr.innerHTML = `
            <span>${producto.codigo}</span>
            <span>${producto.area}</span>
            <span>${producto.cantidad}</span>
            <span>${formatearFecha(producto.fecha)}</span>
        `;
        tbody.appendChild(tr);
    });
}

// Formatear fecha
function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

// Notificar productos al backend
async function notificarProductos() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    const id_bodega = obtenerIdBodega();
    const idusuario = obtenerIdUsuario();

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

        alert('Productos notificados correctamente');
        productosScaneados = [];
        actualizarTablaProductos(productosScaneados);
    } catch (error) {
        console.error('Error al notificar productos:', error.message);
        alert('No se pudieron notificar los productos. Verifica el servidor.');
    }
}

// Resto de las funciones (sin cambios significativos)
function cargarUsuarioYBodega() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token en el localStorage');
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('usuario').value = payload.nombre || 'Usuario no disponible';
        document.getElementById('bodega').value = payload.bodega || 'Bodega no disponible';
    } catch (error) {
        console.error('Error al decodificar el token:', error);
    }
}

function obtenerIdBodega() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const nombreBodega = payload.bodega || null;
        const bodegas = {
            "Corte": 1,
            "Inyeccion": 2,
            "Preparada": 3,
            "Montaje": 4,
            "Terminada": 5,
            "Vulcanizado": 6,
            "Cementada": 9
        };
        return bodegas[nombreBodega] || null;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}

function obtenerIdUsuario() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || null;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
}

// Cargar productos cuando la página se cargue
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
});