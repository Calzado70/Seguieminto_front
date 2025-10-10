
// Variables globales
let productos = [];
let contadorProductos = 0;
let tiempoLectura = null;

// Referencias
const responsableInput = document.getElementById('responsableInput');
const codigoInput = document.getElementById('codigo_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');
const emptyState = document.getElementById('empty-state');

// === Mantener Responsable anterior ===
document.addEventListener('DOMContentLoaded', function () {
  inicializarEventos();
  cargarProductosGuardados();
  actualizarContador();

  const responsableGuardado = localStorage.getItem('inv_responsable');
  if (responsableGuardado) responsableInput.value = responsableGuardado;
});

// Guardar automáticamente los cambios
responsableInput.addEventListener('input', () => {
  localStorage.setItem('inv_responsable', responsableInput.value);
});

// === Inicialización de eventos ===
function inicializarEventos() {
  // Lectura de código desde pistola o manual
  codigoInput.addEventListener('input', () => {
    clearTimeout(tiempoLectura);

    // Espera 300ms después del último carácter antes de procesar
    tiempoLectura = setTimeout(() => {
      const codigo = codigoInput.value.trim();
      if (codigo.length >= 6) { // Ajusta según la longitud mínima de tus códigos
        agregarProducto();
      }
    }, 300);
  });

  // Permitir Enter manual
  codigoInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarProducto();
    }
  });

  botonExportar.addEventListener('click', exportarAExcel);
  codigoInput.focus();
}

// === Agregar producto ===
function agregarProducto() {
  if (!responsableInput.value.trim()) return mostrarAlerta('Por favor ingresa el Responsable', 'error');
  if (!codigoInput.value.trim()) return; // no muestra alerta, evita molestar al lector

  const responsable = responsableInput.value.trim();
  const codigo = codigoInput.value.trim();
  const talla = codigo.slice(-2);
  const cantidad = 1;
  const fecha = new Date().toLocaleDateString('es-CO');

  const productoExistente = productos.find(p =>
    p.responsable === responsable && p.codigo === codigo
  );

  if (productoExistente) {
    productoExistente.cantidad += 1;
    actualizarFilaExistente(productoExistente);
  } else {
    const nuevo = {
      id: Date.now(),
      responsable,
      codigo,
      talla,
      cantidad,
      fecha
    };
    productos.push(nuevo);
    agregarFilaTabla(nuevo);
  }

  limpiarCampos();
  guardarProductos();
  actualizarContador();
}

// === Tabla ===
function agregarFilaTabla(producto) {
  if (emptyState) emptyState.style.display = 'none';
  
  const fila = document.createElement('tr');
  fila.dataset.id = producto.id;
  fila.className = 'fade-in';

  fila.innerHTML = `
    <td>${producto.responsable}</td>
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
  tablaProductos.appendChild(fila);
}

function actualizarFilaExistente(producto) {
  const fila = document.querySelector(`tr[data-id="${producto.id}"]`);
  if (fila) fila.querySelector('td:nth-child(4)').textContent = producto.cantidad;
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
  }
}

function eliminarProducto(id) {
  const clave = prompt("Ingrese la clave de autorización para eliminar:");
  if (clave !== "Admin123*-") return mostrarAlerta("Clave incorrecta.", 'error');

  if (confirm("¿Seguro deseas eliminar este registro?")) {
    productos = productos.filter(p => p.id !== id);
    document.querySelector(`tr[data-id="${id}"]`)?.remove();
    guardarProductos();
    actualizarContador();
    if (productos.length === 0 && emptyState) emptyState.style.display = '';
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
    productos.forEach(agregarFilaTabla);
    actualizarContador();
  }
}

// === Exportar a Excel con selector de ubicación ===
async function exportarAExcel() {
  if (productos.length === 0) return mostrarAlerta('No hay productos para exportar', 'error');

  const wb = XLSX.utils.book_new();
  const datosExcel = productos.map(p => ({
    Responsable: p.responsable,
    Código: p.codigo,
    Talla: p.talla,
    Cantidad: p.cantidad,
    Fecha: p.fecha
  }));

  const ws = XLSX.utils.json_to_sheet(datosExcel);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Inventario_${fecha}.xlsx`;

  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: nombreArchivo,
        types: [{
          description: 'Archivos de Excel',
          accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        }],
      });

      const writable = await handle.createWritable();
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      await writable.write(excelBuffer);
      await writable.close();

      mostrarAlerta('Archivo exportado exitosamente', 'success');
    } else {
      // Fallback para navegadores sin soporte
      XLSX.writeFile(wb, nombreArchivo);
      mostrarAlerta('Archivo exportado (guardado en descargas)', 'success');
    }

    // 🧹 Limpiar después de exportar
    productos = [];
    localStorage.removeItem('inv_productos');
    tablaProductos.innerHTML = '';
    actualizarContador();
    if (emptyState) emptyState.style.display = '';
  } catch (err) {
    console.error('Error al guardar:', err);
    mostrarAlerta('Error al guardar el archivo', 'error');
  }
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
  setTimeout(() => alerta.remove(), 5000);
}
