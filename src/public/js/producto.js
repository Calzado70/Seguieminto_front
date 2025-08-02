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

/**
 * Función que habilita o deshabilita el campo de características
 * según si el usuario está en la bodega de inyección (ID 3)
 */
function gestionarCampoCaracteristicas() {
  const idBodega = localStorage.getItem("bodega");
  console.log('ID Bodega:', idBodega);
  
  const caracteristicasSelect = document.getElementById("caracteristicas");
  console.log('Elemento select:', caracteristicasSelect);
  
  if (!caracteristicasSelect) {
    console.warn("El campo 'caracteristicas' no fue encontrado en el DOM");
    return;
  }

  if (idBodega === "3") {
    console.log('Habilitando campo para bodega 3');
    caracteristicasSelect.disabled = false;
    caracteristicasSelect.style.display = "block";
  } else {
    console.log('Deshabilitando campo para otras bodegas');
    caracteristicasSelect.disabled = true;
    caracteristicasSelect.style.display = "none";
    // Opcional: agregar un elemento que muestre el mensaje
    const mensajeContainer = document.getElementById("mensaje-caracteristicas") || document.createElement("div");
    mensajeContainer.id = "mensaje-caracteristicas";
    mensajeContainer.textContent = "No disponible para esta bodega";
    mensajeContainer.style.color = "#888";
    mensajeContainer.style.marginTop = "5px";
    caracteristicasSelect.after(mensajeContainer);
  }
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

  // Gestionar el campo de características según la bodega
  gestionarCampoCaracteristicas();
  // También cuando cambia la bodega
  document.getElementById('id_bodega').addEventListener('change', function() {
    localStorage.setItem("bodega", this.value);
    gestionarCampoCaracteristicas();
  });
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
  const caracteristicas = document.getElementById("caracteristicas").value || "N/A";
  const fecha = formatearFecha(new Date().toISOString());

  if (productos[codigo]) {
    productos[codigo].cantidad += 1;
    const fila = document.querySelector(`tr[data-codigo="${codigo}"]`);
    if (fila) {
      fila.querySelector(".cantidad").textContent = productos[codigo].cantidad;
    }
  } else {
    productos[codigo] = {
      usuario,
      bodegaOrigen,
      bodegaDestino,
      cantidad: 1,
      codigo,
      tipoMovimiento,
      caracteristicas,
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
      <td>${caracteristicas}</td>
      <td>${fecha}</td>
      <td><button class="btn-eliminar" data-codigo="${codigo}">🗑️ Eliminar</button></td>
    `;

    document.getElementById("tablaProductos").appendChild(fila);
  }

  document.getElementById("totalProductos").textContent = Object.keys(productos).length;
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("btn-eliminar")) {
    const codigo = e.target.getAttribute("data-codigo");

    const confirmar = confirm(`¿Estás seguro de que deseas eliminar el producto con código ${codigo}?`);
    if (!confirmar) return;

    // Eliminar del objeto
    delete productos[codigo];

    // Eliminar del DOM
    const fila = document.querySelector(`tr[data-codigo="${codigo}"]`);
    if (fila) fila.remove();

    // Actualizar contador
    document.getElementById("totalProductos").textContent = Object.keys(productos).length;
  }
});

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
    const codigo_producto = fila.cells[4].textContent.trim();
    const cantidad = parseInt(fila.cells[3].textContent);
    const caracteristicas = fila.cells[6].textContent.trim();

    // 🟡 Si es bodega de inyección (ID 3) y hay una característica válida, actualizarla primero
    if (id_bodega_origen === 3 && caracteristicas !== 'N/A' && caracteristicas !== '') {
      try {
        const actualizarResp = await fetch('http://localhost:4000/product/actualizar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo_producto,
            nueva_caracteristica: caracteristicas
          })
        });

        const actualizarResult = await actualizarResp.json();

        if (!actualizarResp.ok) {
          alert(`Error al actualizar característica del producto ${codigo_producto}: ${actualizarResult.error || 'Desconocido'}`);
          huboError = true;
          break;
        }

        console.log(`✅ Característica actualizada: ${actualizarResult.mensaje}`);

      } catch (error) {
        console.error('Error al actualizar característica:', error);
        alert(`Error de red al actualizar característica del producto ${codigo_producto}`);
        huboError = true;
        break;
      }
    }

    // 🟢 Transferencia
    const data = {
      id_bodega_origen,
      id_bodega_destino,
      codigo_producto,
      cantidad,
      id_usuario,
      observaciones,
      tipo_movimiento,
      caracteristicas
    };

    try {
      const response = await fetch('http://localhost:4000/product/transferencia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      // Manejo de errores del backend
      if (!response.ok) {
        const errorMensaje = result?.error?.toLowerCase?.() || '';
        if (errorMensaje.includes('stock insuficiente')) {
          document.getElementById('mensajeErrorStock').textContent = `Error: ${result.error}`;
          document.getElementById('modalErrorStock').style.display = 'flex';
          huboError = true;
          break;
        }

        alert(`Error en la transferencia: ${result.error || 'Desconocido'}`);
        huboError = true;
        break;
      }

      console.log(`✅ Transferencia exitosa: ${result.mensaje}`);

    } catch (error) {
      console.error('Error al transferir producto:', error);
      alert('Error en la solicitud al transferir producto');
      huboError = true;
      break;
    }
  }

  // ✅ Si todo fue bien, limpiar la tabla
  if (!huboError) {
    alert('✅ Todos los productos han sido transferidos correctamente.');

    // Limpiar tabla
    const tablaBody = document.querySelector('#tablaProductos');
    tablaBody.innerHTML = '';

    // Reset contador
    document.getElementById('totalProductos').textContent = '0';
  }
});



document.getElementById("cerrarModalErrorStock").addEventListener("click", () => {
  document.getElementById("modalErrorStock").style.display = "none";
});