// ===============================
// INVENTARIO MATERIA PRIMA - FINAL
// ===============================

let productos = [];
let lecturaEnProceso = false;
const CLAVE_SEGURIDAD = '123456789';

// DOM
const usuarioSelect = document.getElementById('usuarioSelect');
const conteoSelect = document.getElementById('conteoSelect');
const bodegaSelect = document.getElementById('BodegaSelect');
const unidadSelect = document.getElementById('UnidadSelect');
const tallaInput = document.getElementById('talla_producto');
const codigoInput = document.getElementById('codigo_producto');
const cantidadInput = document.getElementById('cantidad_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');

document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  cargarProductosGuardados();
  actualizarContador();
  codigoInput.focus();
});

function inicializarEventos() {
  codigoInput.addEventListener('input', manejarLecturaCodigo);
  botonExportar.addEventListener('click', exportarAExcel);
}

// ===============================
// SEGURIDAD CLAVE (1 - 9)
// ===============================
function pedirClave() {
  const clave = prompt('Ingrese la clave de seguridad:');
  if (clave === null) return false;

  if (clave !== CLAVE_SEGURIDAD) {
    alert('❌ Clave incorrecta');
    return false;
  }

  return true;
}

// ===============================
// CÓDIGO DE BARRAS
// ===============================
function normalizarCodigo(valor) {
  return valor.replace(/\s+/g, '').trim();
}

function manejarLecturaCodigo() {
  if (lecturaEnProceso) return;

  const codigo = normalizarCodigo(codigoInput.value);

  if (codigo.length < 13) return;

  if (codigo.length > 13) {
    mostrarError('El código debe tener EXACTAMENTE 13 caracteres');
    return;
  }

  lecturaEnProceso = true;
  setTimeout(() => agregarProductoConCodigo(codigo), 50);
}

// ===============================
// AGREGAR / ACTUALIZAR
// ===============================
function agregarProductoConCodigo(codigo) {
  if (!usuarioSelect.value) return mostrarError('Selecciona una pareja');
  if (!conteoSelect.value) return mostrarError('Selecciona un conteo');
  if (!bodegaSelect.value) return mostrarError('Selecciona una zona');
  if (!unidadSelect.value) return mostrarError('Selecciona unidad');

  const cantidad = parseFloat(cantidadInput.value);
  if (!cantidad || cantidad <= 0) return mostrarError('Cantidad inválida');

  const pareja = usuarioSelect.options[usuarioSelect.selectedIndex].text;
  const conteo = conteoSelect.options[conteoSelect.selectedIndex].text;
  const bodega = bodegaSelect.options[bodegaSelect.selectedIndex].text;
  const unidad = unidadSelect.options[unidadSelect.selectedIndex].text;
  const talla = tallaInput.value.trim() || 'N/A';
  const fecha = new Date().toLocaleDateString('es-CO');

  const existente = productos.find(p =>
    p.codigo === codigo &&
    p.pareja === pareja &&
    p.conteo === conteo &&
    p.bodega === bodega &&
    p.unidad === unidad &&
    p.talla === talla
  );

  if (existente) {
    existente.cantidad = cantidad;
    actualizarFilaExistente(existente, true);
  } else {
    const producto = {
      id: Date.now() + Math.random(),
      pareja, conteo, bodega, codigo, talla, unidad, cantidad, fecha
    };
    productos.unshift(producto);
    agregarFilaTabla(producto, true);
  }

  finalizarLectura();
  guardarProductos();
  actualizarContador();
}

function mostrarError(mensaje) {
  alert(mensaje);
  finalizarLectura();
}

function finalizarLectura() {
  codigoInput.value = '';
  cantidadInput.value = '';
  tallaInput.value = '';
  lecturaEnProceso = false;
  codigoInput.focus();
}

// ===============================
// TABLA
// ===============================
function agregarFilaTabla(p, moverArriba) {
  const tr = document.createElement('tr');
  tr.dataset.id = p.id;
  tr.innerHTML = `
    <td>${p.pareja}</td>
    <td>${p.conteo}</td>
    <td>${p.bodega}</td>
    <td>${p.codigo}</td>
    <td>${p.talla}</td>
    <td>${p.unidad}</td>
    <td><strong>${p.cantidad}</strong></td>
    <td>
      <button onclick="editarProducto(${p.id})">✏️</button>
      <button onclick="eliminarProducto(${p.id})">🗑️</button>
    </td>
  `;
  if (moverArriba) tablaProductos.prepend(tr);
  else tablaProductos.appendChild(tr);
}

function actualizarFilaExistente(p) {
  const fila = document.querySelector(`tr[data-id="${p.id}"]`);
  if (fila) fila.children[6].innerHTML = `<strong>${p.cantidad}</strong>`;
}

// ===============================
// EDITAR
// ===============================
function editarProducto(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  const nuevaCantidad = prompt('Nueva cantidad:', producto.cantidad);
  if (nuevaCantidad === null) return;

  const cantidad = parseFloat(nuevaCantidad);
  if (!cantidad || cantidad <= 0) {
    alert('Cantidad inválida');
    return;
  }

  producto.cantidad = cantidad;
  actualizarFilaExistente(producto);
  guardarProductos();
}

// ===============================
// ELIMINAR (CON CLAVE)
// ===============================
function eliminarProducto(id) {
  if (!pedirClave()) return;

  if (!confirm('¿Seguro que deseas eliminar este registro?')) return;

  productos = productos.filter(p => p.id !== id);
  document.querySelector(`tr[data-id="${id}"]`)?.remove();

  guardarProductos();
  actualizarContador();
}

// ===============================
// STORAGE
// ===============================
function guardarProductos() {
  localStorage.setItem('inventario_productos', JSON.stringify(productos));
}

function cargarProductosGuardados() {
  const data = localStorage.getItem('inventario_productos');
  if (!data) return;
  productos = JSON.parse(data);
  productos.forEach(p => agregarFilaTabla(p));
}

function actualizarContador() {
  totalProductos.textContent = productos.length;
}

// ===============================
// EXPORTAR (CON CLAVE)
// ===============================
function exportarAExcel() {
  if (!productos.length) {
    alert('No hay productos para exportar');
    return;
  }

  if (!pedirClave()) return;

  const wb = XLSX.utils.book_new();

  const datosExcel = productos.map(p => ({
    pareja: p.pareja,
    conteo: p.conteo,
    bodega: p.bodega,
    codigo: p.codigo,
    talla: p.talla,
    unidad: p.unidad,
    cantidad: p.cantidad,
    fecha: p.fecha
  }));

  const ws = XLSX.utils.json_to_sheet(datosExcel);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  const pareja = usuarioSelect.options[usuarioSelect.selectedIndex].text.replace(/\s+/g, '');
  const conteo = conteoSelect.options[conteoSelect.selectedIndex].text.replace(/\s+/g, '');
  const zona = bodegaSelect.options[bodegaSelect.selectedIndex].text;

  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0];
  const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '-');

  const nombreArchivo = `Inventario_${pareja}_${conteo}_${zona}_${fecha}_${hora}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);
  limpiarInventario();
}

// ===============================
// LIMPIAR
// ===============================
function limpiarInventario() {
  productos = [];
  tablaProductos.innerHTML = '';
  localStorage.removeItem('inventario_productos');
  actualizarContador();
}
