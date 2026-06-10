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
// VALIDAR CODIGO EN CATALOGO
// =========================

async function validarCodigo(codigo) {

  try {

    const response = await fetch(
      "http://192.168.1.13:4000/product/consultar",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          codigo_barras:codigo
        })
      }
    );


    const data = await response.json();


    return data;


  } catch(error){

    console.error(error);


    return {
      ok:false,
      mensaje:"Error consultando catálogo"
    };

  }

}

// =========================
async function agregarProducto() {


const codigo = codigoInput.value.trim();
  if (codigo.length < 13 || codigo.length > 14) {
  return mostrarAlerta('El código debe tener entre 13 y 14 dígitos', 'error');
}

// =========================
// VALIDAR CATALOGO
// =========================

const validacion = await validarCodigo(codigo);


console.log("RESPUESTA CATALOGO:", validacion);



if(!validacion.ok){

  codigoInput.value="";
  codigoInput.focus();

  return mostrarAlerta(
    validacion.mensaje,
    "error"
  );

}


const sku = validacion.producto.sku;

const referencia = validacion.producto.referencia;

  const talla = parseInt(codigo.slice(-2), 10);

// Validar talla
if (talla < 28 || talla > 48) {
  codigoInput.value = '';
  codigoInput.focus();

  return mostrarAlerta(
    `La talla ${talla} no es válida. Solo se permiten tallas entre 28 y 48.`,
    'error'
  );
}

  let existente = productos.find(p =>
    p.codigo === codigo
  );

  if (existente) {

    existente.cantidad++;

    actualizarFila(existente);

} else {
    const nuevo = {

      id: Date.now(),

      codigo,

      sku,

      referencia,

      talla,

      cantidad:1,

      fecha:new Date().toLocaleDateString('es-CO')

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
  <td class="code-cell">${p.codigo}</td>
  <td><span class="sku-pill">${p.sku}</span></td>
  <td>${p.referencia}</td>
  <td><span class="talla-badge">${p.talla}</span></td>
  <td><span class="cant-badge">${p.cantidad}</span></td>
  <td>
    <div class="action-buttons">
      <button class="btn-editar" onclick="editarProducto(${p.id})" title="Editar cantidad">
        <i class="fas fa-pencil"></i>
      </button>
      <button class="btn-eliminar" onclick="eliminarProducto(${p.id})" title="Eliminar">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </td>
`;


  tablaProductos.appendChild(tr);
}

function moverFilaInicio(id) {
  const fila = document.querySelector(`tr[data-id="${id}"]`);
  if (fila) tablaProductos.prepend(fila);
}

function actualizarFila(p) {

  const fila = document.querySelector(`tr[data-id="${p.id}"]`);

  if (!fila) return;


  fila.querySelector('td:nth-child(5) .cant-badge').textContent = p.cantidad;

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
    "Linea Fin_1",
    
    // Bloque 2 (Registro 450)
    "Centro de operación",
    "Tipo de documento",
    "Consecutivo de documento",
    "Fecha del documento",
    "Tercero",
    "Clase de documento",
    "Notas_1",
    "Concepto",
    "Bodega salida",
    "Bodega entrada",
    // Bloque 3 (Registro 470)
    "Fin de linea",
    "Centro de operación movimiento",
    "Tipo de documento movimiento",
    "Consecutivo documento movimiento",
    "Numero de registro movimiento",
    "Bodega",
    "Ubicación",
    "Concepto movimiento",
    "Motivo",
    "Centro de operación movimiento 2",
    "Unidad de medida",
    "Cantidad base",
    "Unidad de inventario del item",
    "Referencia item",
    "Código de barras",
    "Extension 1",
    "Unidad de negocio movimiento",
    
    // Bloque 4 (Registro 9999)
    "Linea Fin Final",
    "linea fin_2"
  ];

  // CONSTRUIR LOS DATOS PARA EL EXCEL (CADA PRODUCTO ES UNA FILA)
  const dataExcel = productos.map((p, index) => {
    const fila = {};

    columnasOrdenadas.forEach(col => {
      switch (col) {
        // ========== BLOQUE 1: REGISTRO 0000 ==========
        case "Linea Fin_1":
          fila[col] = 1;
          break;

        // ========== BLOQUE 2: REGISTRO 450 ==========
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
        case "Concepto":
          fila[col] = 605;
          break;
        case "Bodega salida":
          fila[col] = "BPR04";
          break;
        case "Bodega entrada":
          fila[col] = "BPT01";
          break;


        // ========== BLOQUE 3: REGISTRO 470 ==========
        case "Fin de linea":
          fila[col] = 1;
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
        case "Bodega":
          fila[col] = "BPR04";
          break;
        case "Ubicación":
          fila[col] = "0000";
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
        case "Unidad de medida":
          fila[col] = "PAR";
          break;
        case "Cantidad base":
          fila[col] = Number(p.cantidad).toFixed(4);
          break;
        case "Unidad de inventario del item":
          fila[col] = "PAR";
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
        case "Unidad de negocio movimiento":
          fila[col] = "001";
          break;

        // ========== BLOQUE 4: REGISTRO 9999 ==========
        case "Linea Fin Final":
          fila[col] = 1;
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
