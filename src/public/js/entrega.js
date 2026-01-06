let productos = [];

// Referencias
const responsableInput = document.getElementById('responsableInput');
const cajaInput = document.getElementById('cajaInput');
const codigoInput = document.getElementById('codigo_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');
const emptyState = document.getElementById('empty-state');

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  actualizarContador();
  codigoInput.focus();
});

// Escaneo / escritura
codigoInput.addEventListener('input', () => {
  if (codigoInput.value.trim().length === 13) agregarProducto();
});

codigoInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') agregarProducto();
});

botonExportar.addEventListener('click', exportarAExcel);

// =========================
function agregarProducto() {

  if (!responsableInput.value || !cajaInput.value)
    return mostrarAlerta('Responsable y Caja son obligatorios', 'error');

  const codigo = codigoInput.value.trim();
  if (codigo.length !== 13)
    return mostrarAlerta('Código inválido', 'error');

  const responsable = responsableInput.value;
  const caja = cajaInput.value;
  const talla = codigo.slice(-2);

  let existe = productos.find(p =>
    p.responsable === responsable &&
    p.caja === caja &&
    p.codigo === codigo
  );

  if (existe) {
    existe.cantidad++;
    moverFilaInicio(existe.id);
    actualizarFila(existe);
  } else {
    const nuevo = {
      id: Date.now(),
      responsable,
      caja,
      codigo,
      talla,
      cantidad: 1,
      fecha: new Date().toLocaleDateString('es-CO')
    };

    productos.unshift(nuevo);
    agregarFilaInicio(nuevo);
  }

  guardarProductos();
  actualizarContador();
  codigoInput.value = '';
  codigoInput.focus();
}

// =========================
function agregarFilaInicio(p) {
  emptyState.style.display = 'none';

  const tr = document.createElement('tr');
  tr.dataset.id = p.id;
  tr.className = 'fade-in';

  tr.innerHTML = `
    <td>${p.responsable}</td>
    <td>${p.caja}</td>
    <td>${p.codigo}</td>
    <td>${p.talla}</td>
    <td>${p.cantidad}</td>
    <td>
      <div class="action-buttons">
        <button class="btn-editar" onclick="editarProducto(${p.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-eliminar" onclick="eliminarProducto(${p.id})"><i class="fas fa-trash"></i></button>
      </div>
    </td>
  `;

  tablaProductos.prepend(tr);
}

function moverFilaInicio(id) {
  const fila = document.querySelector(`tr[data-id="${id}"]`);
  if (fila) tablaProductos.prepend(fila);
}

function actualizarFila(p) {
  const fila = document.querySelector(`tr[data-id="${p.id}"]`);
  fila.querySelector('td:nth-child(5)').textContent = p.cantidad;
}

// =========================
function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  const cant = prompt('Nueva cantidad:', p.cantidad);
  if (!isNaN(cant)) {
    p.cantidad = parseInt(cant);
    actualizarFila(p);
    guardarProductos();
  }
}

function eliminarProducto(id) {
  productos = productos.filter(p => p.id !== id);
  document.querySelector(`tr[data-id="${id}"]`).remove();
  guardarProductos();
  actualizarContador();

  if (productos.length === 0) emptyState.style.display = '';
}

// =========================
function actualizarContador() {
  totalProductos.textContent = productos.length;
}

function guardarProductos() {
  localStorage.setItem('inv_productos', JSON.stringify(productos));
}

function cargarProductos() {
  const data = localStorage.getItem('inv_productos');
  if (data) {
    productos = JSON.parse(data);
    productos.forEach(agregarFilaInicio);
  }
}

// =========================
function exportarAExcel() {
  if (!productos.length) return;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(productos);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  XLSX.writeFile(wb, 'Inventario.xlsx');

  productos = [];
  guardarProductos();
  tablaProductos.innerHTML = '';
  emptyState.style.display = '';
  actualizarContador();
}

// =========================
function mostrarAlerta(msg, tipo) {
  alert(msg);
}
