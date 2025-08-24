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
        // Extraer la talla (últimos 2 números del código)
        const talla = codigo.slice(-2);
        
        // Auto-completar cantidad si está vacía
        if (!cantidadInput.value) {
            cantidadInput.value = 0.5;
        }
        
        // Si el código está completo (puedes ajustar la longitud según tus códigos)
        if (codigo.length >= 13) {
            setTimeout(() => {
                agregarProducto();
            }, 100); // Pequeño delay para asegurar que se complete la lectura
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
    
    if (!codigoInput.value.trim()) {
        alert('Por favor ingresa el código del producto');
        return;
    }
    
    const codigo = codigoInput.value.trim();
    const cantidad = parseFloat(cantidadInput.value) || 0.5;
    const pareja = usuarioSelect.options[usuarioSelect.selectedIndex].text;
    const conteo = conteoSelect.options[conteoSelect.selectedIndex].text;
    const bodega = bodegaSelect.options[bodegaSelect.selectedIndex].text;
    const talla = codigo.slice(-2);
    const fecha = new Date().toLocaleDateString('es-CO');

    // Prefijos según la bodega seleccionada
    let prefijo = "";
    switch (bodega) {
        case "Corte":
            prefijo = "PPC";
            break;
        case "Montaje":
            prefijo = "PPM";
            break;
        case "Guarnecida":
            prefijo = "PPG";
            break;
        case "Inyeccion":
            prefijo = "PPI";
            break;
        case "Terminada":
            prefijo = "PPT";
            break;
    }
    
    // Buscar si el producto ya existe
    const productoExistente = productos.find(p => 
        p.codigo === codigo && 
        p.pareja === pareja && 
        p.conteo === conteo
    );
    
    if (productoExistente) {
        // Sumar la cantidad al producto existente
        productoExistente.cantidad += cantidad;
        productoExistente.pares = Math.floor(productoExistente.cantidad / 1);
        actualizarFilaExistente(productoExistente);
    } else {
        // Crear nuevo producto
        const nuevoProducto = {
            id: Date.now() + Math.random(),
            pareja: pareja,
            conteo: conteo,
            bodega: bodega,
            codigo: prefijo + codigo,
            talla: talla,
            cantidad: cantidad,
            pares: Math.floor(cantidad / 1),
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
    // 🔹 Recalcular prefijo por seguridad
    let prefijo = "";
    switch (producto.bodega) {
        case "Corte": prefijo = "PPC"; break;
        case "Montaje": prefijo = "PPM"; break;
        case "Guarnecida": prefijo = "PPG"; break;
        case "Inyeccion": prefijo = "PPI"; break;
        case "Terminada": prefijo = "PPT"; break;
    }
    if (!producto.codigo.startsWith(prefijo)) {
        producto.codigo = prefijo + producto.codigo;
    }

    const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
    if (fila) {
        fila.innerHTML = `
            <td>${producto.pareja}</td>
            <td>${producto.conteo}</td>
            <td>${producto.bodega}</td>
            <td>${producto.codigo}</td> <!-- 👈 ahora sí siempre con prefijo -->
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

        fila.classList.add('fila-actualizada');
        setTimeout(() => fila.classList.remove('fila-actualizada'), 2000);
    }
}


function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const nuevaCantidad = prompt('Ingresa la nueva cantidad:', producto.cantidad);
    if (nuevaCantidad !== null && !isNaN(nuevaCantidad)) {
        producto.cantidad = parseFloat(nuevaCantidad);
        producto.pares = Math.floor(producto.cantidad / 1);
        actualizarFilaExistente(producto);
        guardarProductos();
    }
}

function eliminarProducto(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        productos = productos.filter(p => p.id !== id);
        const fila = document.querySelector(`tr[data-id="${id}"]`);
        if (fila) {
            fila.remove();
        }
        guardarProductos();
        actualizarContador();
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
            // 🔹 Si por algún motivo aún no tiene prefijo, lo agregamos aquí:
            let prefijo = "";
            switch (producto.bodega) {
                case "Corte": prefijo = "PPC"; break;
                case "Montaje": prefijo = "PPM"; break;
                case "Guarnecida": prefijo = "PPG"; break;
                case "Inyeccion": prefijo = "PPI"; break;
                case "Terminada": prefijo = "PPT"; break;
            }
            if (!producto.codigo.startsWith(prefijo)) {
                producto.codigo = prefijo + producto.codigo;
            }

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
        
        const datosExcel = productos.map(producto => ({
            'Pareja': producto.pareja,
            'Conteo': producto.conteo,
            'Código': producto.codigo,
            'Bodega': producto.bodega || '',
            'Talla': producto.talla,
            'Cantidad': producto.cantidad,
            'Pares': producto.pares,
            'Fecha': producto.fecha
        }));
        
        const ws = XLSX.utils.json_to_sheet(datosExcel);
        
        const wscols = [
            { wch: 15 }, { wch: 12 }, { wch: 15 },
            { wch: 20 }, { wch: 8 }, { wch: 12 },
            { wch: 8 }, { wch: 12 }
        ];
        ws['!cols'] = wscols;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
        
        // 🔹 Construir el nombre del archivo dinámicamente
        const fecha = new Date().toISOString().split('T')[0];
        const pareja = usuarioSelect.options[usuarioSelect.selectedIndex]?.text || "SinPareja";
        const conteo = conteoSelect.options[conteoSelect.selectedIndex]?.text || "SinConteo";
        const bodega = bodegaSelect.options[bodegaSelect.selectedIndex]?.text || "SinBodega";

        // Limpiar espacios para evitar errores en el nombre de archivo
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


// Función específica para limpiar después de exportación
function limpiarInventarioDespuesExportacion() {
    // Confirmar limpieza
    const confirmar = confirm('El inventario ha sido exportado exitosamente.\n¿Desea limpiar los registros de la tabla?');
    
    if (confirmar) {
        // Limpiar array de productos
        productos = [];
        
        // Limpiar tabla HTML
        tablaProductos.innerHTML = '';
        
        // Limpiar localStorage
        localStorage.removeItem('inventario_productos');
        
        // Actualizar contador
        actualizarContador();
        
        // Limpiar campos de entrada
        limpiarCampos();
        
        alert('Registros limpiados exitosamente. Puede comenzar un nuevo inventario.');
    }
}

// Función para limpiar todo el inventario (utilidad)
function limpiarInventario() {
    if (confirm('¿Estás seguro de que deseas limpiar todo el inventario? Esta acción no se puede deshacer.')) {
        productos = [];
        tablaProductos.innerHTML = '';
        localStorage.removeItem('inventario_productos');
        actualizarContador();
        alert('Inventario limpiado exitosamente');
    }
}

// Auto-enfoque en el campo de código al hacer clic en cualquier parte de la página
document.addEventListener('click', function(e) {
    if (!e.target.matches('input, select, button')) {
        codigoInput.focus();
    }
});

// Prevenir que se pierda el foco del campo de código
codigoInput.addEventListener('blur', function() {
    setTimeout(() => {
        if (!document.activeElement.matches('input, select, button')) {
            codigoInput.focus();
        }
    }, 100);
});