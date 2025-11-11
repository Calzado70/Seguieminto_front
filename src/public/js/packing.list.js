let productos = [];
const pedidoInput = document.getElementById('pedidoInput');
const cajaInput = document.getElementById('cajaInput');
const responsableSelect = document.getElementById('responsableSelect');
const codigoInput = document.getElementById('codigo_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');
const emptyState = document.getElementById('empty-state');
const CLAVE_ADMIN = "Admin123*-";

document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  cargarProductosGuardados();
  actualizarContador();

  const pedidoGuardado = localStorage.getItem('packing_pedido');
  const cajaGuardada = localStorage.getItem('packing_caja');
  const responsableGuardado = localStorage.getItem('packing_responsable');

  if (pedidoGuardado) pedidoInput.value = pedidoGuardado;
  if (cajaGuardada) cajaInput.value = cajaGuardada;
  if (responsableGuardado) responsableSelect.value = responsableGuardado;
});

[pedidoInput, cajaInput, responsableSelect].forEach(input => {
  input.addEventListener('input', () => {
    const key = `packing_${input.id.replace('Input', '').replace('Select', '')}`;
    localStorage.setItem(key, input.value);
  });
});

function inicializarEventos() {
  codigoInput.addEventListener('input', manejarCodigoIngresado);
  codigoInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') agregarProducto();
  });
  botonExportar.addEventListener('click', exportarAExcel);
  codigoInput.focus();
}

function manejarCodigoIngresado() {
  const codigo = codigoInput.value.trim();
  if (codigo.length >= 13) {
    setTimeout(() => agregarProducto(), 100);
  }
}

function agregarProducto() {
  if (!pedidoInput.value.trim()) return mostrarAlerta('Por favor ingresa el Pedido', 'error');
  if (!cajaInput.value.trim()) return mostrarAlerta('Por favor ingresa la Caja', 'error');
  if (!responsableSelect.value) return mostrarAlerta('Por favor selecciona el Responsable', 'error');
  if (!codigoInput.value.trim()) return mostrarAlerta('Por favor ingresa el Código del producto', 'error');

  const responsable = responsableSelect.options[responsableSelect.selectedIndex].text;
  const pedido = pedidoInput.value.trim();
  const caja = cajaInput.value.trim();
  const codigo = codigoInput.value.trim();
  const talla = codigo.slice(-2);
  const cantidad = 1;
  const fecha = new Date().toLocaleDateString('es-CO');

  const productoExistente = productos.find(p =>
    p.pedido === pedido && p.caja === caja && p.responsable === responsable && p.codigo === codigo
  );

  if (productoExistente) {
    productoExistente.cantidad += 1;
    actualizarFilaExistente(productoExistente);
  } else {
    const nuevo = { id: Date.now(), responsable, pedido, caja, codigo, talla, cantidad, fecha };
    productos.push(nuevo);
    agregarFilaTabla(nuevo);
  }

  limpiarCampos();
  guardarProductos();
  actualizarContador();
}

function agregarFilaTabla(producto) {
  if (emptyState) emptyState.style.display = 'none';
  const fila = document.createElement('tr');
  fila.dataset.id = producto.id;
  fila.className = 'fade-in';
  fila.innerHTML = `
    <td>${producto.responsable}</td>
    <td>${producto.pedido}</td>
    <td>${producto.caja}</td>
    <td>${producto.codigo}</td>
    <td>${producto.talla}</td>
    <td>${producto.cantidad}</td>
    <td>
      <div class="action-buttons">
        <button class="btn-editar" onclick="editarProducto(${producto.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})"><i class="fas fa-trash"></i></button>
      </div>
    </td>`;
  tablaProductos.appendChild(fila);
}

function actualizarFilaExistente(producto) {
  const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
  if (fila) fila.querySelector('td:nth-child(6)').textContent = producto.cantidad;
}

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
  const clave = prompt("Ingrese la clave de autorización para eliminar:");
  if (clave !== CLAVE_ADMIN) return mostrarAlerta("Clave incorrecta.", 'error');
  if (confirm("¿Seguro deseas eliminar este registro?")) {
    productos = productos.filter(p => p.id !== id);
    document.querySelector(`tr[data-id="${id}"]`)?.remove();
    guardarProductos();
    actualizarContador();
    if (productos.length === 0 && emptyState) emptyState.style.display = '';
  }
}

function limpiarCampos() {
  codigoInput.value = '';
  codigoInput.focus();
}

function actualizarContador() {
  totalProductos.textContent = productos.length;
}

function guardarProductos() {
  localStorage.setItem('packing_productos', JSON.stringify(productos));
}

function cargarProductosGuardados() {
  const guardados = localStorage.getItem('packing_productos');
  if (guardados) {
    productos = JSON.parse(guardados);
    productos.forEach(agregarFilaTabla);
    actualizarContador();
  }
}

function exportarAExcel() {
  if (productos.length === 0) return mostrarAlerta('No hay productos para exportar', 'error');
  const wb = XLSX.utils.book_new();
  const datosExcel = productos.map(p => ({
    Responsable: p.responsable,
    Pedido: p.pedido,
    Caja: p.caja,
    Código: p.codigo,
    Talla: p.talla,
    Cantidad: p.cantidad,
    Fecha: p.fecha
  }));
  const ws = XLSX.utils.json_to_sheet(datosExcel);
  XLSX.utils.book_append_sheet(wb, ws, 'PackingList');
  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `PackingList_${fecha}.xlsx`);
  limpiarRegistros();
  mostrarModalConfirmacion();
}

function limpiarRegistros() {
  productos = [];
  guardarProductos();
  tablaProductos.innerHTML = `
    <tr id="empty-state">
      <td colspan="7">
        <div class="empty-state">
          <i class="fas fa-box-open"></i>
          <p>No hay productos agregados aún</p>
        </div>
      </td>
    </tr>`;
  actualizarContador();
}

function mostrarModalConfirmacion() {
  const modal = document.getElementById('modalConfirmacion');
  modal.style.display = 'flex';
  setTimeout(() => modal.style.display = 'none', 3000);
}

function mostrarAlerta(mensaje, tipo) {
  const alertasAnteriores = document.querySelectorAll('.alert');
  alertasAnteriores.forEach(a => a.remove());
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo}`;
  alerta.innerHTML = `<i class="fas fa-${tipo === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i> ${mensaje}`;
  document.querySelector('.cont-segun-list').insertBefore(alerta, document.querySelector('.form-grid'));
  setTimeout(() => alerta.remove(), 4000);
}
