// ===============================
// INVENTARIO INICIAL - JS FINAL
// ===============================

// Variables globales
let productos = [];
let lecturaEnProceso = false;

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
  codigoInput.focus();
});

// ===============================
// EVENTOS
// ===============================
function inicializarEventos() {

  // Lectura de pistola
  codigoInput.addEventListener('input', manejarLecturaCodigo);

  // Bloquear espacios manuales
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
    mostrarErrorCodigo('El código debe tener EXACTAMENTE 13 dígitos');
    return;
  }
  setTimeout(() => {
    agregarProductoConCodigo(codigo);
  }, 50);
}

async function validarCodigo(codigo) {

    try {

        const response = await fetch('http://192.168.1.13:4000/product/consultar', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    codigo_barras: codigo
                })
            }
        );

        const data = await response.json();

        return data;

    } catch (error) {

        console.error(error);

        return {
            ok: false,
            mensaje: "Error consultando catálogo"
        };

    }
}

// ===============================
// AGREGAR PRODUCTO
// ===============================
async function agregarProductoConCodigo(codigo) {

  const validacion = await validarCodigo(codigo);

if (!validacion.ok) {

    mostrarErrorCodigo(
        validacion.mensaje
    );

    return;
}

  if (!usuarioSelect.value) return mostrarErrorCodigo('Selecciona una pareja');
  if (!conteoSelect.value) return mostrarErrorCodigo('Selecciona un conteo');
  if (!bodegaSelect.value) return mostrarErrorCodigo('Selecciona una zona');

  const cantidad = parseFloat(cantidadInput.value) || 1;
  const pareja = usuarioSelect.options[usuarioSelect.selectedIndex].text;
  const conteo = conteoSelect.options[conteoSelect.selectedIndex].text;
  const bodega = bodegaSelect.options[bodegaSelect.selectedIndex].text;
  const talla = codigo.slice(-2);
  const fecha = new Date().toLocaleDateString('es-CO');
  console.log("VALIDACION:", validacion);
  const sku = validacion.producto.sku;
  const referencia = validacion.producto.referencia;

  const existente = productos.find(p =>
    p.codigo === codigo &&
    p.pareja === pareja &&
    p.conteo === conteo &&
    p.bodega === bodega
  );

  if (existente) {
    existente.cantidad += cantidad;
    existente.pares = Math.floor(existente.cantidad);

    // mover arriba
    productos = productos.filter(p => p.id !== existente.id);
    productos.unshift(existente);

    actualizarFilaExistente(existente, true);
  } else {
    const producto = {
    id: Date.now() + Math.random(),

    pareja,
    conteo,
    bodega,

    codigo,

    sku,

    referencia,

    talla,

    cantidad,

    pares: Math.floor(cantidad),

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
// ERRORES
// ===============================
function mostrarErrorCodigo(mensaje) {
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
function agregarFilaTabla(producto, esPrimero = false) {
  const fila = document.createElement('tr');
  fila.dataset.id = producto.id;

  fila.innerHTML = `
    <td>${producto.pareja}</td>
    <td>${producto.conteo}</td>
    <td>${producto.bodega}</td>

    <td>${producto.codigo}</td>
    <td>${producto.sku}</td>
    <td>${producto.referencia}</td>

    <td>${producto.talla}</td>
    <td>${producto.fecha}</td>
    <td>
      <strong>${producto.cantidad}</strong>
      (${producto.pares} ${producto.pares === 1 ? 'par' : 'pares'})
      <br>
      <button onclick="editarProducto(${producto.id})">✏️</button>
      <button onclick="eliminarProducto(${producto.id})">🗑️</button>
    </td>
  `;

  if (esPrimero && tablaProductos.firstChild) {
    tablaProductos.insertBefore(fila, tablaProductos.firstChild);
    resaltarFila(fila);
  } else {
    tablaProductos.appendChild(fila);
  }
}

function actualizarFilaExistente(producto, moverArriba = false) {
  const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
  if (!fila) return;

  fila.querySelector('td:last-child').innerHTML = `
    <strong>${producto.cantidad}</strong>
    (${producto.pares} ${producto.pares === 1 ? 'par' : 'pares'})
    <br>
    <button onclick="editarProducto(${producto.id})">✏️</button>
    <button onclick="eliminarProducto(${producto.id})">🗑️</button>
  `;

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

  const nuevaCantidad = prompt('Nueva cantidad:', p.cantidad);
  if (!isNaN(nuevaCantidad)) {
    p.cantidad = parseFloat(nuevaCantidad);
    p.pares = Math.floor(p.cantidad);
    actualizarFilaExistente(p);
    guardarProductos();
  }
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
// EXPORTAR
// ===============================
function exportarAExcel() {
  if (!productos.length) {
    alert('No hay productos para exportar');
    return;
  }

  const clave = prompt('Clave para exportar:');
  if (clave !== '1234') return;

  const confirmacion = confirm(`Vas a exportar ${productos.length} productos. ¿Continuar?`);
  if (!confirmacion) return;


  // Crear Excel
  const wb = XLSX.utils.book_new();
  // 🔽 Datos SIN la columna "pares"
const datosExcel = productos.map(p => ({
  Pareja: p.pareja,
  Conteo: p.conteo,
  Zona: p.bodega,
  sku: p.sku,
  Referencia: p.referencia,
  Codigo: p.codigo,
  Talla: p.talla,
  Cantidad: p.cantidad,
  Fecha: p.fecha
}));

const ws = XLSX.utils.json_to_sheet(datosExcel);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  // 📅 Fecha y hora
const ahora = new Date();

const fecha = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
const hora = ahora
  .toTimeString()
  .split(' ')[0]
  .replace(/:/g, '-'); // HH-MM-SS

// 📌 Conteo seleccionado
const conteoTexto =
  conteoSelect.options[conteoSelect.selectedIndex]?.text || 'SinConteo';

// 🧼 Limpiar texto
const conteoLimpio = conteoTexto.replace(/\s+/g, '');

// 📝 Nombre final
const nombreArchivo = `Inventario_${conteoLimpio}_${fecha}_${hora}.xlsx`;

// 💾 Guardar archivo
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


  // 🧹 LIMPIAR TODO DESPUÉS DE EXPORTAR
  limpiarInventario();
}

function limpiarInventario() {
  productos = [];
  tablaProductos.innerHTML = '';
  localStorage.removeItem('inventario_productos');
  actualizarContador();
  codigoInput.focus();
}
