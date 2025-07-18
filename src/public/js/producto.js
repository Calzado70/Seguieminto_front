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
        option.value = bodega.bodega_id; // aquí se usa el ID
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


document.getElementById("btnMoverProducto").addEventListener("click", () => {
  const filas = document.querySelectorAll("#tablaProductos tr");
  const productos = [];

  filas.forEach(fila => {
    const columnas = fila.querySelectorAll("td");
    const producto = {
      id_usuario: localStorage.getItem("usuario_id"), // o el valor desde otro input oculto
      id_bodega_origen: document.getElementById("bodegaActual").dataset.id, // asegúrate que lo tengas
      id_bodega_destino: document.getElementById("id_bodega").value,
      codigo_producto: columnas[4].textContent,
      cantidad: parseInt(columnas[3].textContent),
      observaciones: document.getElementById("observaciones").value,
      tipo_movimiento: columnas[5].textContent
    };
    productos.push(producto);
  });

  fetch('http://localhost:4000/product/transferencia', {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productos })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.mensaje || "Transferencia realizada con éxito");
      // limpiar tabla o redirigir si es necesario
    })
    .catch(err => {
      console.error("Error en la transferencia:", err);
      alert("Ocurrió un error al transferir los productos.");
    });
});






