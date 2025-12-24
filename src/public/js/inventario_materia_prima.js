// ===============================
// INVENTARIO MATERIA PRIMA - FINAL
// ===============================

// Variables globales
let productos = [];
let lecturaEnProceso = false;

// Referencias DOM
const usuarioSelect = document.getElementById('usuarioSelect');
const conteoSelect = document.getElementById('conteoSelect');
const bodegaSelect = document.getElementById('BodegaSelect');
const unidadSelect = document.getElementById('UnidadSelect');
const codigoInput = document.getElementById('codigo_producto');
const cantidadInput = document.getElementById('cantidad_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');

// ===============================
// INICIALIZACIÓN
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  cargarProductosGuardados();
  actualizarContador();
  codigoInput.focus();
});

// ===============================
// EVENTOS
// ===============================
function inicializarEventos() {

  // Lectura de pistola
  codigoInput.addEventListener('input', manejarLecturaCodigo);

  // Bloquear espacios
  codigoInput.addEventListener('keydown', e => {
    if (e.key === ' ') e.preventDefault();
  });

  // Exportar
  botonExportar.addEventListener('click', exportarAExcel);
}

// ===============================
// NORMALIZAR CÓDIGO
// ===============================
function normalizarCodigo(valor) {
  return valor
    .replace(/\s+/g, '')
    .replace(/[^0-9]/g, '')
    .trim();
}

// ===============================
// MANEJO DE LECTURA
// ===============================
function manejarLecturaCodigo() {

  if (lecturaEnProceso) return;

  const codigo = normalizarCodigo(codigoInput.value);

  if (codigo.length < 13) return;

  lecturaEnProceso = true;

  if (codigo.length !== 13) {
    mostrarError('El código debe tener exactamente 13 dígitos');
    return;
  }

  setTimeout(() => agregarProductoConCodigo(codigo), 50);
}

// ===============================
// AGREGAR / ACTUALIZAR PRODUCTO
// ===============================
function agregarProductoConCodigo(codigo) {

  if (!usuarioSelect.value) return mostrarError('Selecciona una pareja');
  if (!conteoSelect.value) return mostrarError('Selecciona un conteo');
  if (!bodegaSelect.value) return mostrarError('Selecciona una zona');
  if (!unidadSelect.value) return mostrarError('Selecciona unidad de medida');

  const cantidad = parseFloat(cantidadInput.value);
  if (!cantidad || cantidad <= 0) {
    cantidadInput.focus();
    return mostrarError('Digita una cantidad válida');
  }

  const pareja = usuarioSelect.options[usuarioSelect.selectedIndex].text;
  const conteo = conteoSelect.options[conteoSelect.selectedIndex].text;
  const bodega = bodegaSelect.options[bodegaSelect.selectedIndex].text;
  const unidad = unidadSelect.options[unidadSelect.selectedIndex].text;
  const talla = codigo.slice(-2);
  const fecha = new Date().toLocaleDateString('es-CO');

  const existente = productos.find(p =>
    p.codigo === codigo &&
    p.pareja === pareja &&
    p.conteo === conteo &&
    p.bodega === bodega &&
    p.unidad === unidad
  );

  // 🔁 REEMPLAZA CANTIDAD
  if (existente) {
    existente.cantidad = cantidad;

    productos = productos.filter(p => p.id !== existente.id);
    productos.unshift(existente);

    actualizarFilaExistente(existente, true);
  }
  // 🆕 CREA
  else {
    const producto = {
      id: Date.now() + Math.random(),
      pareja,
      conteo,
      bodega,
      unidad,
      codigo,
      talla,
      cantidad,
      fecha
    };

    productos.unshift(producto);
    agregarFilaTabla(producto, true);
  }

  finalizarLectura();
  guardarProductos();
  actualizarContador();
}

// ===============================
// MENSAJES ERROR
// ===============================
function mostrarError(mensaje) {
  alert(mensaje);
  finalizarLectura();
}

// ===============================
// FINALIZAR LECTURA
// ===============================
function finalizarLectura() {
  codigoInput.value = '';
  cantidadInput.value = '';
  lecturaEnProceso = false;
  codigoInput.focus();
}

// ===============================
// TABLA
// ===============================
function agregarFilaTabla(producto, moverArriba = false) {
  const fila = document.createElement('tr');
  fila.dataset.id = producto.id;

  fila.innerHTML = `
    <td>${producto.pareja}</td>
    <td>${producto.conteo}</td>
    <td>${producto.bodega}</td>
    <td>${producto.codigo}</td>
    <td>${producto.talla}</td>
    <td>${producto.unidad}</td>
    <td><strong>${producto.cantidad}</strong></td>
    <td>
      <button onclick="editarProducto(${producto.id})">✏️</button>
      <button onclick="eliminarProducto(${producto.id})">🗑️</button>
    </td>
  `;

  if (moverArriba && tablaProductos.firstChild) {
    tablaProductos.insertBefore(fila, tablaProductos.firstChild);
    resaltarFila(fila);
  } else {
    tablaProductos.appendChild(fila);
  }
}

function actualizarFilaExistente(producto, moverArriba = false) {
  const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
  if (!fila) return;

  fila.children[6].innerHTML = `<strong>${producto.cantidad}</strong>`;

  if (moverArriba) {
    tablaProductos.insertBefore(fila, tablaProductos.firstChild);
    resaltarFila(fila);
  }
}

// ===============================
// RESALTAR FILA
// ===============================
function resaltarFila(fila) {
  fila.classList.add('fila-nueva');
  setTimeout(() => fila.classList.remove('fila-nueva'), 800);
}

// ===============================
// CONTADOR / STORAGE
// ===============================
function actualizarContador() {
  totalProductos.textContent = productos.length;
}

function guardarProductos() {
  localStorage.setItem('inventario_productos', JSON.stringify(productos));
}

function cargarProductosGuardados() {
  const data = localStorage.getItem('inventario_productos');
  if (!data) return;

  productos = JSON.parse(data);
  productos.forEach(p => agregarFilaTabla(p));
  actualizarContador();
}

// ===============================
// EDITAR / ELIMINAR
// ===============================
function editarProducto(id) {
  const p = productos.find(p => p.id === id);
  if (!p) return;

  const nuevaCantidad = parseFloat(prompt('Nueva cantidad:', p.cantidad));
  if (!nuevaCantidad || nuevaCantidad <= 0) return;

  p.cantidad = nuevaCantidad;
  actualizarFilaExistente(p);
  guardarProductos();
}

function eliminarProducto(id) {
  const clave = prompt('Clave:');
  if (clave !== '123456789') return;

  productos = productos.filter(p => p.id !== id);
  document.querySelector(`tr[data-id="${id}"]`)?.remove();
  guardarProductos();
  actualizarContador();
}

// ===============================
// EXPORTAR A EXCEL
// ===============================
function exportarAExcel() {

  if (!productos.length) {
    alert('No hay productos para exportar');
    return;
  }

  const clave = prompt('Clave para exportar:');
  if (clave !== '123456789') return;

  if (!confirm(`Vas a exportar ${productos.length} productos. ¿Continuar?`)) return;

  const wb = XLSX.utils.book_new();

  const datosExcel = productos.map(p => ({
    Pareja: p.pareja,
    Conteo: p.conteo,
    Zona: p.bodega,
    Codigo: p.codigo,
    Talla: p.talla,
    Unidad: p.unidad,
    Cantidad: p.cantidad,
    Fecha: p.fecha
  }));

  const ws = XLSX.utils.json_to_sheet(datosExcel);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0];
  const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '-');
  const conteoTexto = conteoSelect.options[conteoSelect.selectedIndex]?.text || 'SinConteo';

  const nombreArchivo = `Inventario_${conteoTexto.replace(/\s+/g, '')}_${fecha}_${hora}.xlsx`;

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  limpiarInventario();
}

// ===============================
// LIMPIAR INVENTARIO
// ===============================
function limpiarInventario() {
  productos = [];
  tablaProductos.innerHTML = '';
  localStorage.removeItem('inventario_productos');
  actualizarContador();
  codigoInput.focus();
}
