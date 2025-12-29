// ===============================
// INVENTARIO MATERIA PRIMA - FINAL
// ===============================

let productos = [];
let lecturaEnProceso = false;

// DOM
const usuarioSelect = document.getElementById('usuarioSelect');
const conteoSelect = document.getElementById('conteoSelect');
const bodegaSelect = document.getElementById('BodegaSelect');
const unidadSelect = document.getElementById('UnidadSelect');
const codigoInput = document.getElementById('codigo_producto');
const tallaInput = document.getElementById('talla_producto');
const cantidadInput = document.getElementById('cantidad_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');

document.addEventListener('DOMContentLoaded', () => {
  codigoInput.focus();
  cargarProductos();
  actualizarContador();
});

codigoInput.addEventListener('input', manejarLectura);
codigoInput.addEventListener('keydown', e => {
  if (e.key === ' ') e.preventDefault();
});

botonExportar.addEventListener('click', exportarExcel);

function normalizarCodigo(valor) {
  return valor.replace(/\s+/g, '').replace(/[^0-9]/g, '');
}

function manejarLectura() {
  if (lecturaEnProceso) return;

  const codigo = normalizarCodigo(codigoInput.value);
  if (codigo.length < 13) return;

  lecturaEnProceso = true;
  agregarProducto(codigo);
}

function agregarProducto(codigo) {

  if (!usuarioSelect.value) return error('Selecciona pareja');
  if (!conteoSelect.value) return error('Selecciona conteo');
  if (!bodegaSelect.value) return error('Selecciona zona');
  if (!unidadSelect.value) return error('Selecciona unidad');

  const cantidad = parseFloat(cantidadInput.value);
  if (!cantidad || cantidad <= 0) return error('Cantidad inválida');

  const producto = {
    id: Date.now(),
    pareja: usuarioSelect.value,
    conteo: conteoSelect.value,
    bodega: bodegaSelect.value,
    codigo,
    talla: tallaInput.value.trim() || 'N/A',
    unidad: unidadSelect.value,
    cantidad,
    fecha: new Date().toLocaleDateString('es-CO')
  };

  productos.unshift(producto);
  agregarFila(producto);
  guardarProductos();
  actualizarContador();
  limpiarInputs();
}

function agregarFila(p) {
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
      <button onclick="eliminar(${p.id})">🗑️</button>
    </td>
  `;

  tablaProductos.prepend(tr);
}

function eliminar(id) {
  if (prompt('Clave:') !== '123456789') return;

  productos = productos.filter(p => p.id !== id);
  document.querySelector(`tr[data-id="${id}"]`)?.remove();
  guardarProductos();
  actualizarContador();
}

function guardarProductos() {
  localStorage.setItem('inventario_mp', JSON.stringify(productos));
}

function cargarProductos() {
  const data = localStorage.getItem('inventario_mp');
  if (!data) return;

  productos = JSON.parse(data);
  productos.forEach(p => agregarFila(p));
}

function actualizarContador() {
  totalProductos.textContent = productos.length;
}

function limpiarInputs() {
  codigoInput.value = '';
  tallaInput.value = '';
  cantidadInput.value = '';
  lecturaEnProceso = false;
  codigoInput.focus();
}

function error(msg) {
  alert(msg);
  lecturaEnProceso = false;
}

function exportarExcel() {
  if (!productos.length) return alert('No hay datos');

  if (prompt('Clave:') !== '123456789') return;

  const datos = productos.map(p => ({
    Pareja: p.pareja,
    Conteo: p.conteo,
    Zona: p.bodega,
    Codigo: p.codigo,
    Talla: p.talla,
    Unidad: p.unidad,
    Cantidad: p.cantidad,
    Fecha: p.fecha
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  XLSX.writeFile(wb, `Inventario_Materia_Prima.xlsx`);
}
