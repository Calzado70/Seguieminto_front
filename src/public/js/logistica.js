// Variables globales
let productoConsultado = null;

const API_URL = "http://localhost:4000";

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

function irAInventario() {
    window.location.href = '/inventario_supervisor';
}

function mostrarMensaje(texto, tipo = 'info') {
    const contenedor = document.getElementById('mensajes');
    contenedor.innerHTML = `<div class="mensaje mensaje-${tipo}">${texto}</div>`;
}

function ocultarResultado() {
    document.getElementById('resultadoProducto').style.display = 'none';
    productoConsultado = null;
}

async function buscarProducto() {
    const input = document.getElementById('codigoBarras');
    const codigoBarras = input.value.trim();

    if (!codigoBarras) {
        mostrarMensaje('Ingrese un código de barras', 'error');
        return;
    }

    ocultarResultado();
    mostrarMensaje('Buscando producto...', 'info');

    try {
        const response = await fetch(`${API_URL}/product/consumo-logistica?codigo_barras=${encodeURIComponent(codigoBarras)}`);

        const data = await response.json();

        if (!response.ok) {
            const msg = (data && data.error) ? data.error : 'No se encontró el producto';
            ocultarResultado();
            mostrarMensaje(msg, 'error');
            return;
        }

        productoConsultado = data.body;

        document.getElementById('rReferencia').textContent = productoConsultado.referencia;
        document.getElementById('rSku').textContent = productoConsultado.sku;
        document.getElementById('rTalla').textContent = productoConsultado.talla;
        document.getElementById('rCodigoProducto').textContent = productoConsultado.codigo_producto;
        document.getElementById('rStock').textContent = `${productoConsultado.stock_disponible} unidades`;

        document.getElementById('cantidadConsumo').value = 1;
        document.getElementById('cantidadConsumo').max = productoConsultado.stock_disponible;

        if (productoConsultado.stock_disponible <= 0) {
            mostrarMensaje('El producto no tiene stock disponible en Terminada Completo', 'error');
            document.getElementById('consumirBoton').disabled = true;
        } else {
            mostrarMensaje('Producto encontrado. Ingrese la cantidad a consumir.', 'ok');
            document.getElementById('consumirBoton').disabled = false;
        }

        document.getElementById('resultadoProducto').style.display = 'block';
    } catch (error) {
        console.error('Error al buscar producto:', error);
        ocultarResultado();
        mostrarMensaje('Error de conexión con el servidor: ' + error.message, 'error');
    }
}

async function consumirLogistica() {
    if (!productoConsultado) {
        mostrarMensaje('Primero busque un producto', 'error');
        return;
    }

    const cantidad = parseInt(document.getElementById('cantidadConsumo').value, 10);
    const max = productoConsultado.stock_disponible;

    if (!cantidad || cantidad <= 0) {
        mostrarMensaje('Ingrese una cantidad válida', 'error');
        return;
    }

    if (cantidad > max) {
        mostrarMensaje(`La cantidad no puede superar el stock disponible (${max})`, 'error');
        return;
    }

    const idUsuario = parseInt(localStorage.getItem('id_usuario'), 10);
    const observaciones = `Consumo a Logística de ${productoConsultado.referencia} talla ${productoConsultado.talla}`;

    try {
        const response = await fetch(`${API_URL}/product/consumo-logistica`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                codigo_producto: productoConsultado.codigo_producto,
                cantidad,
                id_usuario: idUsuario,
                observaciones,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            const msg = (data && data.error) ? data.error : 'No se pudo realizar el consumo';
            mostrarMensaje(msg, 'error');
            return;
        }

        mostrarMensaje(`Consumo realizado: ${cantidad} unidades de ${productoConsultado.codigo_producto} enviadas a Logística`, 'ok');
        buscarProducto();
    } catch (error) {
        console.error('Error al consumir:', error);
        mostrarMensaje('Error de conexión con el servidor: ' + error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();

    // Búsqueda por escáner o digitación
    document.getElementById('codigoBarras').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarProducto();
        }
    });

    document.getElementById('buscarProducto').addEventListener('click', buscarProducto);
    document.getElementById('consumirBoton').addEventListener('click', consumirLogistica);
    document.getElementById('verInventario').addEventListener('click', irAInventario);
});