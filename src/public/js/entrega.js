// Variables globales
let productos = [];
let contadorProductos = 0;

// Referencias
const responsableInput = document.getElementById('responsableInput');
const cajaInput = document.getElementById('cajaInput');
const codigoInput = document.getElementById('codigo_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');
const emptyState = document.getElementById('empty-state');

// === Mantener Responsable y Caja anteriores ===
document.addEventListener('DOMContentLoaded', function () {
  inicializarEventos();
  cargarProductosGuardados();
  actualizarContador();

  const responsableGuardado = localStorage.getItem('inv_responsable');
  const cajaGuardada = localStorage.getItem('inv_caja');

  if (responsableGuardado) responsableInput.value = responsableGuardado;
  if (cajaGuardada) cajaInput.value = cajaGuardada;
});

// Guardar automáticamente los cambios
[responsableInput, cajaInput].forEach(input => {
  input.addEventListener('input', () => {
    const key = `inv_${input.id.replace('Input', '')}`;
    localStorage.setItem(key, input.value);
  });
});

// === Inicialización de eventos ===
function inicializarEventos() {

  // Detectar cuando se escanea el código
  codigoInput.addEventListener('input', manejarCodigoIngresado);

  // Enter manual
  codigoInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') agregarProducto();
  });

  botonExportar.addEventListener('click', exportarAExcel);
  codigoInput.focus();
}

function manejarCodigoIngresado() {
  const codigo = codigoInput.value.trim();

  if (codigo.length === 13) {
    agregarProducto();
    return;
  }

  if (codigo.length > 13) {
    mostrarAlerta('Código no válido (debe tener 13 caracteres)', 'error');
    codigoInput.value = '';
    codigoInput.focus();
    return;
  }

  clearTimeout(window._codigoTimer);
  window._codigoTimer = setTimeout(() => {
    if (codigo.length > 0 && codigo.length < 13) {
      mostrarAlerta('Código no válido (debe tener 13 caracteres)', 'error');
      codigoInput.value = '';
      codigoInput.focus();
    }
  }, 500);
}

// === Agregar producto (ACTUALIZADO CON PRIORIDAD AL SCANEAR) ===
function agregarProducto() {

  if (!responsableInput.value.trim()) 
    return mostrarAlerta('Por favor ingresa el Responsable', 'error');

  if (!cajaInput.value.trim()) 
    return mostrarAlerta('Por favor ingresa la Caja', 'error');

  const codigo = codigoInput.value.trim();

  if (codigo.length !== 13) {
    mostrarAlerta('Código no válido (debe tener 13 caracteres)', 'error');
    codigoInput.value = '';
    codigoInput.focus();
    return;
  }

  const responsable = responsableInput.value.trim();
  const caja = cajaInput.value.trim();
  const talla = codigo.slice(-2);
  const cantidad = 1;
  const fecha = new Date().toLocaleDateString('es-CO');

  let productoExistente = productos.find(p =>
    p.responsable === responsable &&
    p.caja === caja &&
    p.codigo === codigo
  );

  if (productoExistente) {

    // Aumentar cantidad
    productoExistente.cantidad += 1;

    // --- MOVER AL INICIO DEL ARRAY ---
    productos = productos.filter(p => p.id !== productoExistente.id);
    productos.unshift(productoExistente);

    // --- MOVER FILA AL INICIO ---
    moverFilaAlInicio(productoExistente.id);

    actualizarFilaExistente(productoExistente);

  } else {

    const nuevo = {
      id: Date.now(),
      responsable,
      caja,
      codigo,
      talla,
      cantidad,
      fecha
    };

    // Insertar al inicio
    productos.unshift(nuevo);

    agregarFilaAlInicio(nuevo);
  }

  limpiarCampos();
  guardarProductos();
  actualizarContador();
}

// === Mover fila existente al inicio ===
function moverFilaAlInicio(id) {
  const fila = document.querySelector(`tr[data-id="${id}"]`);
  if (!fila) return;
  tablaProductos.prepend(fila);
}

// === Agregar fila al inicio de la tabla (NUEVO) ===
function agregarFilaAlInicio(producto) {
  if (emptyState) emptyState.style.display = 'none';

  const fila = document.createElement('tr');
  fila.dataset.id = producto.id;
  fila.className = 'fade-in';

  fila.innerHTML = `
    <td>${producto.responsable}</td>
    <td>${producto.caja}</td>
    <td>${producto.codigo}</td>
    <td>${producto.talla}</td>
    <td>${producto.cantidad}</td>
    <td>
      <div class="action-buttons">
        <button class="btn-editar" onclick="editarProducto(${producto.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </td>
  `;

  tablaProductos.prepend(fila);
}

function actualizarFilaExistente(producto) {
  const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
  if (fila) fila.querySelector('td:nth-child(5)').textContent = producto.cantidad;
}

// === Editar / Eliminar ===
function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;

  const nuevaCant = prompt("Nueva cantidad:", p.cantidad);
  if (nuevaCant !== null && !isNaN(nuevaCant)) {
    p.cantidad = parseInt(nuevaCant);
    actualizarFilaExistente(p);
    guardarProductos();
    mostrarAlerta("Cantidad actualizada correctamente", "success");
  }
}

function eliminarProducto(id) {
  if (confirm("¿Seguro deseas eliminar este registro?")) {
    productos = productos.filter(p => p.id !== id);
    document.querySelector(`tr[data-id="${id}"]`)?.remove();
    guardarProductos();
    actualizarContador();
    if (productos.length === 0 && emptyState) emptyState.style.display = '';
    mostrarAlerta("Producto eliminado correctamente", "success");
  }
}

// === Funciones auxiliares ===
function limpiarCampos() {
  codigoInput.value = '';
  codigoInput.focus();
}

function actualizarContador() {
  totalProductos.textContent = productos.length;
}

function guardarProductos() {
  localStorage.setItem('inv_productos', JSON.stringify(productos));
}

function cargarProductosGuardados() {
  const guardados = localStorage.getItem('inv_productos');
  if (guardados) {
    productos = JSON.parse(guardados);
    productos.forEach(agregarFilaAlInicio); // mantener orden correcto
    actualizarContador();
  }
}

// === Exportar a Excel ===
function exportarAExcel() {
  if (productos.length === 0) return mostrarAlerta('No hay productos para exportar', 'error');

  const wb = XLSX.utils.book_new();
  const datosExcel = productos.map(p => ({
    Responsable: p.responsable,
    Caja: p.caja,
    Código: p.codigo,
    Talla: p.talla,
    Cantidad: p.cantidad,
    Fecha: p.fecha
  }));

  const ws = XLSX.utils.json_to_sheet(datosExcel);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Inventario_${fecha}.xlsx`);

  mostrarAlerta('Archivo exportado exitosamente', 'success');

  // Limpiar tabla y almacenamiento
  productos = [];
  guardarProductos();
  tablaProductos.innerHTML = '';
  if (emptyState) emptyState.style.display = '';
  actualizarContador();
}

// === Alertas ===
function mostrarAlerta(mensaje, tipo) {
  document.querySelectorAll('.alert').forEach(a => a.remove());
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo}`;
  alerta.innerHTML = `
    <i class="fas fa-${tipo === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
    ${mensaje}
  `;
  document.querySelector('.cont-segun-list').insertBefore(alerta, document.querySelector('.form-grid'));
  setTimeout(() => alerta.remove(), 4000);
}
