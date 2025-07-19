function verificarTokenAlCargar() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiracion = payload.exp * 1000;
    if (Date.now() >= expiracion) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    // Guardar el ID del usuario si no está ya en localStorage
    if (!localStorage.getItem("id_usuario") && payload.id_usuario) {
      localStorage.setItem("id_usuario", payload.id_usuario);
    }

  } catch (error) {
    console.error("Error al verificar el token:", error);
    localStorage.removeItem("token");
    window.location.href = "/";
  }
}

function redirigir(selectId) {
  const selectElement = document.getElementById(selectId);
  selectElement.addEventListener("change", function () {
    const selectedOption =
      selectElement.options[selectElement.selectedIndex].value;
    if (selectedOption) {
      window.location.href = selectedOption;
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const usuarioInput = document.getElementById("usuario");
  const bodegaActualInput = document.getElementById("bodegaActual");

  // Obtener datos del localStorage
  const nombreUsuario = localStorage.getItem("nombre");
  const nombreBodega = localStorage.getItem("nombre_bodega");
  const idBodega = localStorage.getItem("bodega");

  // Asignar valores a los campos si existen
  if (nombreUsuario && usuarioInput) {
    usuarioInput.value = nombreUsuario;
  }

  if (nombreBodega && bodegaActualInput) {
    bodegaActualInput.value = nombreBodega;
    bodegaActualInput.setAttribute("data-id", idBodega);
  }
});


async function cargarBodegas() {
  const select = document.getElementById('id_bodega'); // este ID es correcto según tu HTML

  try {
    const res = await fetch('http://localhost:4000/bode/mostrar'); // Ajusta si es necesario
    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      data.data.forEach(bodega => {
        const option = document.createElement('option');
        option.value = bodega.id_bodega; // aquí se usa el ID
        option.textContent = bodega.nombre; // nombre visible
        select.appendChild(option);
      });
    } else {
      console.warn('No se encontraron bodegas');
    }
  } catch (error) {
    console.error('Error al cargar bodegas:', error);
  }
}
document.addEventListener("DOMContentLoaded", function () {
  verificarTokenAlCargar(); 
  cargarBodegas();
  
  // Guardar la bodega destino seleccionada en localStorage
const selectBodegaDestino = document.getElementById("id_bodega");

selectBodegaDestino.addEventListener("change", function () {
  const selectedOption = this.options[this.selectedIndex];
  const id_bodega = selectedOption.value;
  const bodegaNombre = selectedOption.textContent;

  if (id_bodega) {
    localStorage.setItem("bodega_destino_id", id_bodega);
    localStorage.setItem("bodega_destino_nombre", bodegaNombre);
    console.log(`✅ Bodega destino guardada: ${bodegaNombre} (ID: ${id_bodega})`);
  }
});


});



document.addEventListener("DOMContentLoaded", () => {
  const inputCodigo = document.getElementById("codigo_producto");
  const tablaProductos = document.getElementById("tablaProductos");
  const totalProductos = document.getElementById("totalProductos");

  const productos = {}; // clave: código, valor: objeto con info (cantidad, etc.)

  function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

  inputCodigo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const codigo = inputCodigo.value.trim();
      if (!codigo) return;

      agregarProductoATabla(codigo);
      inputCodigo.value = "";
    }
  });

  function agregarProductoATabla(codigo) {
    const usuario = document.getElementById("usuario").value || "Desconocido";
    const bodegaOrigen = document.getElementById("bodegaActual").value || "No asignada";
    const bodegaDestino = document.getElementById("id_bodega").selectedOptions[0]?.text || "N/A";
    const tipoMovimiento = document.getElementById("tipoMovimientoSelect").value || "N/A";

    const fecha = formatearFecha(new Date().toISOString());

    // Si ya existe el producto, solo actualizamos cantidad
    if (productos[codigo]) {
      productos[codigo].cantidad += 1;

      // Actualizamos la fila en la tabla
      const fila = document.querySelector(`tr[data-codigo="${codigo}"]`);
      if (fila) {
        fila.querySelector(".cantidad").textContent = productos[codigo].cantidad;
      }
    } else {
      // Si es nuevo, lo agregamos
      productos[codigo] = {
        usuario,
        bodegaOrigen,
        bodegaDestino,
        cantidad: 1,
        codigo,
        tipoMovimiento,
        fecha,
      };

      const fila = document.createElement("tr");
      fila.setAttribute("data-codigo", codigo);
      fila.innerHTML = `
        <td>${usuario}</td>
        <td>${bodegaOrigen}</td>
        <td>${bodegaDestino}</td>
        <td class="cantidad">1</td>
        <td>${codigo}</td>
        <td>${tipoMovimiento}</td>
        <td>${fecha}</td>
      `;
      tablaProductos.appendChild(fila);
    }

    // Actualizar total de productos únicos
    totalProductos.textContent = Object.keys(productos).length;
  }
});


document.getElementById('mover-productos').addEventListener('click', async () => {
  const tabla = document.getElementById('tablaProductos');
  const filas = tabla.querySelectorAll('tbody tr');

  const id_bodega_origen = parseInt(localStorage.getItem('bodega'));
  const id_bodega_destino = parseInt(localStorage.getItem('bodega_destino_id'));
  const tipo_movimiento = document.getElementById('tipoMovimientoSelect').value;
  const observaciones = document.getElementById('observaciones').value || '';
  const id_usuario = parseInt(localStorage.getItem('id_usuario'));

  if (!id_bodega_origen || !id_bodega_destino || !tipo_movimiento || !id_usuario) {
    alert('Faltan datos requeridos.');
    return;
  }

  let huboError = false;

  for (const fila of filas) {
    const codigo_producto = fila.cells[4].textContent;
    const cantidad = parseInt(fila.cells[3].textContent);

    const data = {
      id_bodega_origen,
      id_bodega_destino,
      codigo_producto,
      cantidad,
      id_usuario,
      observaciones,
      tipo_movimiento
    };

    try {
      const response = await fetch('http://localhost:4000/product/transferencia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      // 🔍 Verificamos el mensaje del SP
      const mensaje = result?.mensaje?.toLowerCase?.() || '';

      if (mensaje.includes('stock insuficiente')) {
        document.getElementById('mensajeErrorStock').textContent = `Error: ${mensaje}`;
        document.getElementById('modalErrorStock').style.display = 'flex';
        huboError = true;
        break; // Detenemos el resto del procesamiento
      }

    } catch (error) {
      console.error('Error al transferir producto:', error);
      alert('Error en la solicitud');
    }
  }

  if (!huboError) {
    alert('Todos los productos han sido transferidos correctamente.');
  }
});

document.getElementById("cerrarModalErrorStock").addEventListener("click", () => {
  document.getElementById("modalErrorStock").style.display = "none";
});









