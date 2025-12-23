// ===============================
// INVENTARIO INICIAL - JS
// ===============================

// Variables globales
let productos = [];
let contadorProductos = 0;

// Referencias DOM
const usuarioSelect = document.getElementById('usuarioSelect');
const conteoSelect = document.getElementById('conteoSelect');
const bodegaSelect = document.getElementById('BodegaSelect');
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
});

// ===============================
// EVENTOS
// ===============================
function inicializarEventos() {

  // Normaliza lectura de pistola
  codigoInput.addEventListener('input', manejarCodigoIngresado);

  // Evita espacios manuales
  codigoInput.addEventListener('keydown', e => {
    if (e.key === ' ') e.preventDefault();
  });

  // Enter manual
  codigoInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarProducto();
    }
  });

  botonExportar.addEventListener('click', exportarAExcel);

  codigoInput.focus();
}

// ===============================
// NORMALIZACIÓN DE CÓDIGO
// ===============================
function normalizarCodigo(valor) {
  return valor
    .replace(/\s+/g, '') // elimina espacios, tabs, enters
    .toUpperCase()
    .trim();
}

// ===============================
// MANEJO DE LECTOR
// ===============================
function manejarCodigoIngresado() {
  const codigo = normalizarCodigo(codigoInput.value);

  if (codigo.length >= 2 && !cantidadInput.value) {
    cantidadInput.value = 1;
  }

  // Ajusta longitud según tu estándar de códigos
  if (codigo.length >= 13) {
    setTimeout(() => {
      agregarProducto();
    }, 80);
  }
}

// ===============================
// AGREGAR PRODUCTO
// ===============================
function agregarProducto() {

  if (!usuarioSelect.value) return alert('Selecciona una pareja');
  if (!conteoSelect.value) return alert('Selecciona un conteo');
  if (!bodegaSelect.value) return alert('Selecciona una zona');

  const codigo = normalizarCodigo(codigoInput.value);
  if (!codigo) return;

  const cantidad = parseFloat(cantidadInput.value) || 1;

  const pareja = usuarioSelect.options[usuarioSelect.selectedIndex].text;
  const conteo = conteoSelect.options[conteoSelect.selectedIndex].text;
  const bodegaTexto = bodegaSelect.options[bodegaSelect.selectedIndex].text;
  const talla = codigo.slice(-2);
  const fecha = new Date().toLocaleDateString('es-CO');

  const productoExistente = productos.find(p =>
    p.codigo === codigo &&
    p.pareja === pareja &&
    p.conteo === conteo &&
    p.bodega === bodegaTexto
  );

  if (productoExistente) {
    productoExistente.cantidad += cantidad;
    productoExistente.pares = Math.floor(productoExistente.cantidad);
    actualizarFilaExistente(productoExistente);
  } else {
    const nuevoProducto = {
      id: Date.now() + Math.random(),
      pareja,
      conteo,
      bodega: bodegaTexto,
      codigo,
      talla,
      cantidad,
      pares: Math.floor(cantidad),
      fecha
    };

    productos.push(nuevoProducto);
    agregarFilaTabla(nuevoProducto);
  }

  limpiarCampos();
  guardarProductos();
  actualizarContador();
}

// ===============================
// TABLA
// ===============================
function agregarFilaTabla(producto) {
  const fila = document.createElement('tr');
  fila.dataset.id = producto.id;

  fila.innerHTML = `
    <td>${producto.pareja}</td>
    <td>${producto.conteo}</td>
    <td>${producto.bodega}</td>
    <td>${producto.codigo}</td>
    <td>${producto.talla}</td>
    <td>${producto.fecha}</td>
    <td>
      <strong>Cant: ${producto.cantidad}</strong>
      (${producto.pares} ${producto.pares === 1 ? 'par' : 'pares'})
      <br>
      <button onclick="editarProducto(${producto.id})">
        ✏️
      </button>
      <button onclick="eliminarProducto(${producto.id})">
        🗑️
      </button>
    </td>
  `;

  tablaProductos.appendChild(fila);
}

function actualizarFilaExistente(producto) {
  const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
  if (!fila) return;

  fila.querySelector('td:last-child').innerHTML = `
    <strong>Cant: ${producto.cantidad}</strong>
    (${producto.pares} ${producto.pares === 1 ? 'par' : 'pares'})
    <br>
    <button onclick="editarProducto(${producto.id})">✏️</button>
    <button onclick="eliminarProducto(${producto.id})">🗑️</button>
  `;

  fila.classList.add('fila-actualizada');
  setTimeout(() => fila.classList.remove('fila-actualizada'), 800);
}

// ===============================
// EDITAR / ELIMINAR
// ===============================
function editarProducto(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  const nuevaCantidad = prompt('Nueva cantidad:', producto.cantidad);
  if (nuevaCantidad !== null && !isNaN(nuevaCantidad)) {
    producto.cantidad = parseFloat(nuevaCantidad);
    producto.pares = Math.floor(producto.cantidad);
    actualizarFilaExistente(producto);
    guardarProductos();
  }
}

function eliminarProducto(id) {
  const clave = prompt('Clave de autorización:');
  if (clave !== '123456789') return alert('Clave incorrecta');

  productos = productos.filter(p => p.id !== id);
  document.querySelector(`tr[data-id="${id}"]`)?.remove();
  guardarProductos();
  actualizarContador();
}

// ===============================
// UTILIDADES
// ===============================
function limpiarCampos() {
  codigoInput.value = '';
  cantidadInput.value = '';
  codigoInput.focus();
}

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
  productos.forEach(agregarFilaTabla);
  actualizarContador();
}

// ===============================
// EXPORTAR
// ===============================
function exportarAExcel() {

  if (!productos.length) return alert('No hay productos');

  const clave = prompt('Clave para exportar:');
  if (clave !== '123456789') return alert('Clave incorrecta');

  const wb = XLSX.utils.book_new();

  const datos = productos.map(p => ({
    Pareja: p.pareja,
    Conteo: p.conteo,
    Zona: p.bodega,
    Código: p.codigo,
    Talla: p.talla,
    Cantidad: p.cantidad,
    Pares: p.pares,
    Fecha: p.fecha
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  XLSX.writeFile(wb, `Inventario_${Date.now()}.xlsx`);

  limpiarInventarioDespuesExportacion();
}

function limpiarInventarioDespuesExportacion() {
  if (!confirm('¿Limpiar inventario después de exportar?')) return;

  productos = [];
  tablaProductos.innerHTML = '';
  localStorage.removeItem('inventario_productos');
  actualizarContador();
  limpiarCampos();
}

// ===============================
// AUTOFOCUS (PISTOLA)
// ===============================
document.addEventListener('click', e => {
  if (!e.target.matches('input, select, button')) {
    codigoInput.focus();
  }
});
