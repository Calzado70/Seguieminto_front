// inventario.inicial.js

// Variables globales
let productos = [];
let contadorProductos = 0;

// Referencias a elementos del DOM
const usuarioSelect = document.getElementById('usuarioSelect');
const conteoSelect = document.getElementById('conteoSelect');
const bodegaSelect = document.getElementById('BodegaSelect');
const codigoInput = document.getElementById('codigo_producto');
const cantidadInput = document.getElementById('cantidad_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    inicializarEventos();
    cargarProductosGuardados();
    actualizarContador();
});

function inicializarEventos() {
    // Evento para cuando se ingresa un código (pistola lectora)
    codigoInput.addEventListener('input', manejarCodigoIngresado);
    
    // Evento para agregar producto manualmente
    codigoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            agregarProducto();
        }
    });
    
    // Evento para el botón de exportar
    botonExportar.addEventListener('click', exportarAExcel);
    
    // Auto-focus en el campo de código para facilitar el uso con pistola lectora
    codigoInput.focus();
}

function manejarCodigoIngresado() {
    const codigo = codigoInput.value.trim();
    
    if (codigo.length >= 2) {
        // Auto-completar cantidad si está vacía
        if (!cantidadInput.value) {
            cantidadInput.value = 1;
        }
        
        // Si el código está completo (ajusta según tus códigos)
        if (codigo.length >= 13) {
            setTimeout(() => {
                agregarProducto();
            }, 100);
        }
    }
}

function agregarProducto() {
    // Validaciones
    if (!usuarioSelect.value) {
        alert('Por favor selecciona una pareja');
        return;
    }
    
    if (!conteoSelect.value) {
        alert('Por favor selecciona un conteo');
        return;
    }
    
    if (!bodegaSelect.value) {
        alert('Por favor selecciona una Zona');
        return;
    }
    
    let codigo = codigoInput.value.trim();
    const cantidad = parseFloat(cantidadInput.value) || 1;
    const pareja = usuarioSelect.options[usuarioSelect.selectedIndex].text;
    const conteo = conteoSelect.options[conteoSelect.selectedIndex].text;
    const bodegaTexto = bodegaSelect.options[bodegaSelect.selectedIndex].text;
    const talla = codigo.slice(-2);
    const fecha = new Date().toLocaleDateString('es-CO');
    
    // Buscar si el producto ya existe (usando código CON prefijo)
    const productoExistente = productos.find(p => 
        p.codigo === codigo && 
        p.pareja === pareja && 
        p.conteo === conteo &&
        p.bodega === bodegaTexto
    );
    
    if (productoExistente) {
        // Sumar la cantidad al producto existente
        productoExistente.cantidad += cantidad;
        productoExistente.pares = Math.floor(productoExistente.cantidad);
        actualizarFilaExistente(productoExistente);
    } else {
        // Crear nuevo producto
        const nuevoProducto = {
            id: Date.now() + Math.random(),
            pareja: pareja,
            conteo: conteo,
            bodega: bodegaTexto,
            codigo: codigo,
            talla: talla,
            cantidad: cantidad,
            pares: Math.floor(cantidad),
            fecha: fecha
        };
        
        productos.push(nuevoProducto);
        agregarFilaTabla(nuevoProducto);
    }
    
    // Limpiar campos y enfocar código para siguiente lectura
    limpiarCampos();
    guardarProductos();
    actualizarContador();
}

function agregarFilaTabla(producto) {
    const fila = document.createElement('tr');
    fila.setAttribute('data-id', producto.id);
    
    fila.innerHTML = `
        <td>${producto.pareja}</td>
        <td>${producto.conteo}</td>
        <td>${producto.bodega}</td>
        <td>${producto.codigo}</td>
        <td>${producto.talla}</td>
        <td>${producto.fecha}</td>
        <td>
            <div class="acciones">
                <span class="cantidad-info">
                    <strong>Cant: ${producto.cantidad}</strong> 
                    (${producto.pares} ${producto.pares === 1 ? 'par' : 'pares'})
                </span>
                <button class="btn-editar" onclick="editarProducto(${producto.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    tablaProductos.appendChild(fila);
}

function actualizarFilaExistente(producto) {
    const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
    if (fila) {
        const celdaAcciones = fila.querySelector('td:last-child');
        celdaAcciones.innerHTML = `
            <div class="acciones">
                <span class="cantidad-info">
                    <strong>Cant: ${producto.cantidad}</strong> 
                    (${producto.pares} ${producto.pares === 1 ? 'par' : 'pares'})
                </span>
                <button class="btn-editar" onclick="editarProducto(${producto.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Resaltar la fila actualizada
        fila.classList.add('fila-actualizada');
        setTimeout(() => {
            fila.classList.remove('fila-actualizada');
        }, 2000);
    }
}

function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const nuevaCantidad = prompt('Ingresa la nueva cantidad:', producto.cantidad);
    if (nuevaCantidad !== null && !isNaN(nuevaCantidad)) {
        producto.cantidad = parseFloat(nuevaCantidad);
        producto.pares = Math.floor(producto.cantidad);
        actualizarFilaExistente(producto);
        guardarProductos();
    }
}

function eliminarProducto(id) {
    const claveCorrecta = "Admin123*-"; // ✅ contraseña para eliminar
    
    const claveIngresada = prompt("Ingrese la clave de autorización para eliminar este registro:");
    if (claveIngresada !== claveCorrecta) {
        if (claveIngresada !== null) {
            alert("Clave incorrecta. No se puede eliminar el producto.");
        }
        return;
    }

    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
        productos = productos.filter(p => p.id !== id);
        const fila = document.querySelector(`tr[data-id="${id}"]`);
        if (fila) {
            fila.remove();
        }
        guardarProductos();
        actualizarContador();
        alert("Producto eliminado exitosamente.");
    }
}

function limpiarCampos() {
    codigoInput.value = '';
    cantidadInput.value = '';
    codigoInput.focus();
}

function actualizarContador() {
    contadorProductos = productos.length;
    totalProductos.textContent = contadorProductos;
}

function guardarProductos() {
    localStorage.setItem('inventario_productos', JSON.stringify(productos));
}

function cargarProductosGuardados() {
    const productosGuardados = localStorage.getItem('inventario_productos');
    if (productosGuardados) {
        productos = JSON.parse(productosGuardados);
        productos.forEach(producto => {
            agregarFilaTabla(producto);
        });
        actualizarContador();
    }
}

function exportarAExcel() {
    if (productos.length === 0) {
        alert('No hay productos para exportar');
        return;
    }
    
    // Solicitar clave de autorización
    const claveIngresada = prompt('Ingrese la clave de autorización para exportar:');
    const claveCorrecta = 'Admin123*-';
    
    if (claveIngresada !== claveCorrecta) {
        if (claveIngresada !== null) {
            alert('Clave incorrecta. No se puede exportar el inventario.');
        }
        return;
    }
    
    try {
        const wb = XLSX.utils.book_new();
        
        // Orden correcto de columnas (igual que la tabla)
        const datosExcel = productos.map(producto => ({
            'Pareja': producto.pareja,
            'Conteo': producto.conteo,
            'Zona': producto.bodega,
            'Código': producto.codigo,
            'Talla': producto.talla,
            'Cantidad': producto.cantidad,
            'Pares': producto.pares,
            'Fecha': producto.fecha
        }));
        
        const ws = XLSX.utils.json_to_sheet(datosExcel);
        
        const wscols = [
            { wch: 15 }, // Pareja
            { wch: 12 }, // Conteo
            { wch: 15 }, // Bodega
            { wch: 20 }, // Código
            { wch: 8 },  // Talla
            { wch: 12 }, // Cantidad
            { wch: 8 },  // Pares
            { wch: 12 }  // Fecha
        ];
        ws['!cols'] = wscols;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
        
        // Nombre de archivo dinámico
        const fecha = new Date().toISOString().split('T')[0];
        const pareja = usuarioSelect.options[usuarioSelect.selectedIndex]?.text || "SinPareja";
        const conteo = conteoSelect.options[conteoSelect.selectedIndex]?.text || "SinConteo";
        const bodega = bodegaSelect.options[bodegaSelect.selectedIndex]?.text || "SinBodega";
        
        const nombreLimpioPareja = pareja.replace(/\s+/g, "_");
        const nombreLimpioConteo = conteo.replace(/\s+/g, "_");
        const nombreLimpioBodega = bodega.replace(/\s+/g, "_");
        
        const nombreArchivo = `Inventario_${nombreLimpioPareja}_${nombreLimpioConteo}_${nombreLimpioBodega}_${fecha}.xlsx`;
        
        XLSX.writeFile(wb, nombreArchivo);
        
        alert('Inventario exportado exitosamente a Excel');
        limpiarInventarioDespuesExportacion();
        
    } catch (error) {
        console.error('Error al exportar:', error);
        alert('Error al generar el archivo Excel. Intente nuevamente.');
    }
}

function limpiarInventarioDespuesExportacion() {
    const confirmar = confirm('El inventario ha sido exportado exitosamente.\n¿Desea limpiar los registros de la tabla?');
    
    if (confirmar) {
        productos = [];
        tablaProductos.innerHTML = '';
        localStorage.removeItem('inventario_productos');
        actualizarContador();
        limpiarCampos();
        alert('Registros limpiados exitosamente. Puede comenzar un nuevo inventario.');
    }
}

function limpiarInventario() {
    if (confirm('¿Estás seguro de que deseas limpiar todo el inventario? Esta acción no se puede deshacer.')) {
        productos = [];
        tablaProductos.innerHTML = '';
        localStorage.removeItem('inventario_productos');
        actualizarContador();
        alert('Inventario limpiado exitosamente');
    }
}

// Auto-enfoque en el campo de código
document.addEventListener('click', function(e) {
    if (!e.target.matches('input, select, button')) {
        codigoInput.focus();
    }
});

codigoInput.addEventListener('blur', function() {
    setTimeout(() => {
        if (!document.activeElement.matches('input, select, button')) {
            codigoInput.focus();
        }
    }, 100);
});