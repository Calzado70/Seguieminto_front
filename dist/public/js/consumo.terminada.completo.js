// Variables globales
let productoConsultado = null;
function irAInventario() {
    window.location.href = '/inventario_supervisor';
}

  function mostrarMensaje(texto, tipo = 'info') {
      toast(texto, tipo);
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
        const data = await apiFetch(`/product/consumo-terminada-proceso?codigo_barras=${encodeURIComponent(codigoBarras)}`);

        productoConsultado = data.body;

        document.getElementById('rReferencia').textContent = productoConsultado.referencia;
        document.getElementById('rSku').textContent = productoConsultado.sku;
        document.getElementById('rTalla').textContent = productoConsultado.talla;
        document.getElementById('rCodigoProducto').textContent = productoConsultado.codigo_producto;
        document.getElementById('rStock').textContent = `${productoConsultado.stock_disponible} unidades`;

        document.getElementById('cantidadConsumo').value = 1;
        document.getElementById('cantidadConsumo').max = productoConsultado.stock_disponible;

        if (productoConsultado.stock_disponible <= 0) {
            mostrarMensaje('El producto no tiene stock disponible en Terminada Proceso', 'error');
            document.getElementById('consumirBoton').disabled = true;
        } else {
            mostrarMensaje('Producto encontrado. Ingrese la cantidad a consumir.', 'ok');
            document.getElementById('consumirBoton').disabled = false;
        }

        document.getElementById('resultadoProducto').style.display = 'block';
    } catch (error) {
        console.error('Error al buscar producto:', error);
        ocultarResultado();
        mostrarMensaje(error.message || 'No se pudo realizar la operacion', 'error');
    }
}

async function consumirTerminadaCompleto() {
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
    const observaciones = `Consumo a Terminada Completo de ${productoConsultado.referencia} talla ${productoConsultado.talla}`;

    try {
        await apiFetch('/product/consumo-terminada-proceso', {
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

        mostrarMensaje(`Consumo realizado: ${cantidad} unidades de ${productoConsultado.codigo_producto} enviadas a Terminada Completo`, 'ok');
        buscarProducto();
    } catch (error) {
        console.error('Error al consumir:', error);
        mostrarMensaje(error.message || 'No se pudo realizar la operacion', 'error');
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
    document.getElementById('consumirBoton').addEventListener('click', consumirTerminadaCompleto);
    document.getElementById('verInventario').addEventListener('click', irAInventario);
});