let productos = [];

// Referencias
const codigoInput = document.getElementById('codigo_producto');
const botonExportar = document.getElementById('mover-productos');
const tablaProductos = document.getElementById('tablaProductos');
const totalProductos = document.getElementById('totalProductos');
const emptyState = document.getElementById('empty-state');
const CLAVE_SEGURIDAD = "1234";

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  actualizarContador();
  codigoInput.focus();
});

// Escaneo automático
codigoInput.addEventListener('input', () => {
  // Solo números
  codigoInput.value = codigoInput.value.replace(/\D/g, '');

  const length = codigoInput.value.trim().length;

  if (length >= 13 && length <= 14) {
    agregarProducto();
  }
});


botonExportar.addEventListener('click', exportarAExcel);

// =========================
function agregarProducto() {

  const codigo = codigoInput.value.trim();
  if (codigo.length < 13 || codigo.length > 14) {
  return mostrarAlerta('El código debe tener entre 13 y 14 dígitos', 'error');
}

  const talla = codigo.slice(-2);

  let existente = productos.find(p =>
    p.codigo === codigo
  );

  if (existente) {
    existente.cantidad++;
    moverFilaInicio(existente.id);
    actualizarFila(existente);
  } else {
    const nuevo = {
      id: Date.now(),
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
    <td>${p.codigo}</td>
    <td>${p.talla}</td>
    <td>${p.cantidad}</td>
    <td>
      <div class="action-buttons">
        <button class="btn-editar" onclick="editarProducto(${p.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-eliminar" onclick="eliminarProducto(${p.id})">
          <i class="fas fa-trash"></i>
        </button>
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

  if (!fila) return;

  fila.querySelector('td:nth-child(3)').textContent = p.cantidad;
}

// =========================
function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  const cant = prompt('Nueva cantidad:', p.cantidad);

  if (cant !== null && !isNaN(cant)) {
    p.cantidad = parseInt(cant);
    actualizarFila(p);
    guardarProductos();
    actualizarContador();
  }
}

function eliminarProducto(id) {
  // Solicitar la clave al usuario
  const password = prompt('Ingrese la clave de seguridad para eliminar este registro:');

  // Si el usuario cancela o la clave es incorrecta
  if (password === null) return; // Usuario canceló

  if (password !== CLAVE_SEGURIDAD) {
    return mostrarAlerta('Clave incorrecta. No se puede eliminar el registro.', 'error');
  }

  // Si la clave es correcta, proceder con la eliminación
  productos = productos.filter(p => p.id !== id);
  document.querySelector(`tr[data-id="${id}"]`)?.remove();

  guardarProductos();
  actualizarContador();

  if (productos.length === 0) {
    emptyState.style.display = '';
  }
  
  mostrarAlerta('Registro eliminado correctamente', 'success');
}

// =========================
function actualizarContador() {
  const total = productos.reduce((sum, p) => sum + p.cantidad, 0);
  totalProductos.textContent = total;
}

// =========================
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
  if (!productos.length)
    return mostrarAlerta('No hay datos para exportar', 'error');

  // FECHA FORMATO YYYYMMDD
  const hoy = new Date();
  const fechaFormateada =
    hoy.getFullYear().toString() +
    String(hoy.getMonth() + 1).padStart(2, '0') +
    String(hoy.getDate()).padStart(2, '0');

  // DEFINIR EL ORDEN EXACTO DE LAS COLUMNAS (SIN REPETICIONES)
  const columnasOrdenadas = [
    // Bloque 1 (Registro 0000)
    "numero de registro_1",
    "tipo de registro_1",
    "subtipo de registro_1",
    "version del tipo de registro_1",
    "compañia_1",
    "Linea Fin_1",
    
    // Bloque 2 (Registro 450)
    "numero de registro_2",
    "tipo de registro_2",
    "subtipo de registro_2",
    "version del tipo de registro_2",
    "compañia_2",
    "indica si el numero consecutivo de docto es manual o automatico",
    "Centro de operación",
    "Tipo de documento",
    "Consecutivo de documento",
    "Fecha del documento",
    "Tercero",
    "Clase de documento",
    "Estado del documento",
    "Estado de impresión",
    "Notas_1",
    "Concepto",
    "Bodega salida",
    "Bodega entrada",
    "Documento alterno",
    "centro de operacion de la tranferencia de salida",
    "tipo de documento de la transferencia salida",
    "consecutivo de documento de la transferencia salida",
    "codigo de vehiculo",
    "codigo transportador",
    "codigo sucursal transportador",
    "codigo conductor",
    "nombre conductor",
    "identificacion del conductor",
    "numero de guia",
    "cajas bultos",
    "peso",
    "volumen",
    "valor asegurado",
    "Notas_2",
    
    // Bloque 3 (Registro 470)
    "Fin de linea",
    "numero de registro_3",
    "tipo de registro_3",
    "subtipo de registro_3",
    "version del tipo de registro_3",
    "compañia_3",
    "Centro de operación movimiento",
    "Tipo de documento movimiento",
    "Consecutivo documento movimiento",
    "Numero de registro movimiento",
    "espacios_1",
    "Bodega",
    "Ubicación",
    "lote",
    "Concepto movimiento",
    "Motivo",
    "Centro de operación movimiento 2",
    "espacios_2",
    "centro de costos movimiento",
    "proyecto",
    "Unidad de medida",
    "Cantidad base",
    "cantidad adicional",
    "costo promedio unitario",
    "Notas_3",
    "descripcion",
    "descripcion del item",
    "Unidad de inventario del item",
    "ubicacion entrada",
    "lote entrada",
    "item",
    "Referencia item",
    "Código de barras",
    "Extension 1",
    "Extension 2",
    "Unidad de negocio movimiento",
    "rowid del movto",
    
    // Bloque 4 (Registro 9999)
    "Linea Fin Final",
    "numero de registro_4",
    "tipo de registro_4",
    "subtipo de registro_4",
    "version del tipo de registro_4",
    "compañia_4",
    "linea fin_2"
  ];

  // CONSTRUIR LOS DATOS PARA EL EXCEL (CADA PRODUCTO ES UNA FILA)
  const dataExcel = productos.map((p, index) => {
    const fila = {};

    columnasOrdenadas.forEach(col => {
      switch (col) {
        // ========== BLOQUE 1: REGISTRO 0000 ==========
        case "numero de registro_1":
          fila[col] = "1";
          break;
        case "tipo de registro_1":
          fila[col] = "0000";
          break;
        case "subtipo de registro_1":
          fila[col] = "00";
          break;
        case "version del tipo de registro_1":
          fila[col] = "01";
          break;
        case "compañia_1":
          fila[col] = "001";
          break;
        case "Linea Fin_1":
          fila[col] = 1;
          break;

        // ========== BLOQUE 2: REGISTRO 450 ==========
        case "numero de registro_2":
          fila[col] = "2";
          break;
        case "tipo de registro_2":
          fila[col] = "450";
          break;
        case "subtipo de registro_2":
          fila[col] = "00";
          break;
        case "version del tipo de registro_2":
          fila[col] = "02";
          break;
        case "compañia_2":
          fila[col] = "001";
          break;
        case "indica si el numero consecutivo de docto es manual o automatico":
          fila[col] = "1";
          break;
        case "Centro de operación":
          fila[col] = "001";
          break;
        case "Tipo de documento":
          fila[col] = "CTS";
          break;
        case "Consecutivo de documento":
          fila[col] = 1;
          break;
        case "Fecha del documento":
          fila[col] = fechaFormateada;
          break;
        case "Tercero":
          fila[col] = "";
          break;
        case "Clase de documento":
          fila[col] = 65;
          break;
        case "Estado del documento":
          fila[col] = 1;
          break;
        case "Estado de impresión":
          fila[col] = 0;
          break;
        case "Concepto":
          fila[col] = 605;
          break;
        case "Bodega salida":
          fila[col] = "BPR04";
          break;
        case "Bodega entrada":
          fila[col] = "BPT01";
          break;
        case "Notas_1":
          fila[col] = p.notas || "";
          break;

        // Campos vacíos del bloque 2
        case "Documento alterno":
        case "centro de operacion de la tranferencia de salida":
        case "tipo de documento de la transferencia salida":
        case "consecutivo de documento de la transferencia salida":
        case "codigo de vehiculo":
        case "codigo transportador":
        case "codigo sucursal transportador":
        case "codigo conductor":
        case "nombre conductor":
        case "identificacion del conductor":
        case "numero de guia":
        case "cajas bultos":
        case "peso":
        case "volumen":
        case "valor asegurado":
        case "Notas_2":
          fila[col] = "";
          break;

        // ========== BLOQUE 3: REGISTRO 470 ==========
        case "Fin de linea":
          fila[col] = 1;
          break;
        case "numero de registro_3":
          fila[col] = "3";
          break;
        case "tipo de registro_3":
          fila[col] = "470";
          break;
        case "subtipo de registro_3":
          fila[col] = "0";
          break;
        case "version del tipo de registro_3":
          fila[col] = "06";
          break;
        case "compañia_3":
          fila[col] = "1";
          break;
        case "Centro de operación movimiento":
          fila[col] = "001";
          break;
        case "Tipo de documento movimiento":
          fila[col] = "CTS";
          break;
        case "Consecutivo documento movimiento":
          fila[col] = 1;
          break;
        case "Numero de registro movimiento":
          fila[col] = index + 1;
          break;
        case "espacios_1":
          fila[col] = "";
          break;
        case "Bodega":
          fila[col] = "BPR04";
          break;
        case "Ubicación":
          fila[col] = "0000";
          break;
        case "lote":
          fila[col] = "";
          break;
        case "Concepto movimiento":
          fila[col] = 605;
          break;
        case "Motivo":
          fila[col] = "02";
          break;
        case "Centro de operación movimiento 2":
          fila[col] = "001";
          break;
        case "espacios_2":
          fila[col] = "";
          break;
        case "centro de costos movimiento":
          fila[col] = "";
          break;
        case "proyecto":
          fila[col] = "";
          break;
        case "Unidad de medida":
          fila[col] = "PAR";
          break;
        case "Cantidad base":
          fila[col] = Number(p.cantidad).toFixed(4);
          break;
        case "cantidad adicional":
          fila[col] = "";
          break;
        case "costo promedio unitario":
          fila[col] = "";
          break;
        case "Notas_3":
          fila[col] = "";
          break;
        case "descripcion":
          fila[col] = "";
          break;
        case "descripcion del item":
          fila[col] = "";
          break;
        case "Unidad de inventario del item":
          fila[col] = "PAR";
          break;
        case "ubicacion entrada":
          fila[col] = "";
          break;
        case "lote entrada":
          fila[col] = "";
          break;
        case "item":
          fila[col] = "";
          break;
        case "Referencia item":
          fila[col] = "";
          break;
        case "Código de barras":
          fila[col] = p.codigo || "";
          break;
        case "Extension 1":
          fila[col] = p.talla || "";
          break;
        case "Extension 2":
          fila[col] = "";
          break;
        case "Unidad de negocio movimiento":
          fila[col] = "001";
          break;
        case "rowid del movto":
          fila[col] = "";
          break;

        // ========== BLOQUE 4: REGISTRO 9999 ==========
        case "Linea Fin Final":
          fila[col] = 1;
          break;
        case "numero de registro_4":
          fila[col] = "4";
          break;
        case "tipo de registro_4":
          fila[col] = "9999";
          break;
        case "subtipo de registro_4":
          fila[col] = "00";
          break;
        case "version del tipo de registro_4":
          fila[col] = "01";
          break;
        case "compañia_4":
          fila[col] = "001";
          break;
        case "linea fin_2":
          fila[col] = 1;
          break;

        default:
          fila[col] = "";
      }
    });

    return fila;
  });

  // CREAR EXCEL CON EL ORDEN DE COLUMNAS ESPECIFICADO
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataExcel, { header: columnasOrdenadas });

  // AJUSTAR ANCHOS DE COLUMNA
  const colWidths = columnasOrdenadas.map(col => ({ wch: Math.max(col.length, 15) }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, `Inventario_${fechaFormateada}.xlsx`);

  // LIMPIAR
  productos = [];
  guardarProductos();
  document.querySelectorAll('#tablaProductos tr:not(#empty-state)')
    .forEach(tr => tr.remove());
  emptyState.style.display = '';
  actualizarContador();
  mostrarAlerta('Excel exportado correctamente', 'success');
}

// =========================
function mostrarAlerta(msg, tipo) {
  alert(msg);
}
