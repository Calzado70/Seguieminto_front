document.addEventListener('DOMContentLoaded', function () {
    const formProducto = document.getElementById('formProducto');
    const codigoProductoInput = document.getElementById('codigo_producto');
    const cantidadInput = document.getElementById('cantidad');
    const tablaProductos = document.getElementById('tablaProductos');
    const totalProductosSpan = document.getElementById('totalProductos');

    let productosAgregados = {}; // Objeto con códigos únicos

    function obtenerFechaFormateada() {
        const fecha = new Date();
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    function actualizarContadorTotal() {
        const total = Object.keys(productosAgregados).length;
        totalProductosSpan.textContent = total;
    }

    function agregarProducto(codigo, cantidad) {
        cantidad = parseInt(cantidad) || 1;

        const esNuevo = !productosAgregados[codigo];

        if (esNuevo) {
            // Crear producto nuevo
            productosAgregados[codigo] = {
                id: 'N/A',
                codigo: codigo,
                cantidad: cantidad,
                bodega: 'N/A',
                fecha: obtenerFechaFormateada()
            };
            agregarFilaTabla(codigo);
        } else {
            // Solo actualizar cantidad y fecha
            productosAgregados[codigo].cantidad += cantidad;
            productosAgregados[codigo].fecha = obtenerFechaFormateada();
            actualizarFilaTabla(codigo);
        }

        // ✅ Solo actualiza el contador si el código es nuevo
        if (esNuevo) {
            actualizarContadorTotal();
        }

        codigoProductoInput.value = '';
        cantidadInput.value = '';
        codigoProductoInput.focus();
    }

    function agregarFilaTabla(codigo) {
        const producto = productosAgregados[codigo];
        const fila = document.createElement('tr');
        fila.className = 'table-row';
        fila.dataset.codigo = codigo;
        fila.innerHTML = `
            <td>${producto.id}</td>
            <td>${producto.codigo}</td>
            <td>${producto.cantidad}</td>
            <td>${producto.bodega}</td>
            <td>${producto.fecha}</td>
        `;
        tablaProductos.appendChild(fila);
    }

    function actualizarFilaTabla(codigo) {
        const producto = productosAgregados[codigo];
        const fila = tablaProductos.querySelector(`tr[data-codigo="${codigo}"]`);
        if (fila) {
            fila.cells[2].textContent = producto.cantidad;
            fila.cells[4].textContent = producto.fecha;
        }
    }

    codigoProductoInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = codigoProductoInput.value.trim();
            const cantidad = cantidadInput.value.trim() || '1';
            if (codigo) {
                agregarProducto(codigo, cantidad);
            }
        }
    });

    cantidadInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = codigoProductoInput.value.trim();
            const cantidad = cantidadInput.value.trim() || '1';
            if (codigo) {
                agregarProducto(codigo, cantidad);
            }
        }
    });
});
