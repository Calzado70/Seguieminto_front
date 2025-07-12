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

document.addEventListener("DOMContentLoaded", function () {
  verificarTokenAlCargar();

  const codigoProductoInput = document.getElementById("codigo_producto");
  const cantidadInput = document.getElementById("cantidad");
  const tablaProductos = document.getElementById("tablaProductos");
  const totalProductosSpan = document.getElementById("totalProductos");
  const idSesionInput = document.getElementById("id_sesion");
  const caracteristicasInput = document.getElementById("caracteristicas");

  const idSesionGuardado = localStorage.getItem("id_sesion");
  if (idSesionGuardado) {
    idSesionInput.value = idSesionGuardado;
    idSesionInput.readOnly = true;
  }

  const idBodega = localStorage.getItem("id_bodega");
if (idBodega !== "3") { // Suponiendo que la bodega 1 es la de inyección
  caracteristicasInput.disabled = true;
} else {
  caracteristicasInput.disabled = false;
}

  let productosAgregados = {};

  function obtenerFechaFormateada() {
    const fecha = new Date();
    return `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}/${fecha.getFullYear()}`;
  }

  function actualizarContadorTotal() {
    totalProductosSpan.textContent = Object.keys(productosAgregados).length;
  }

  function agregarFilaTabla(producto) {
    const fila = document.createElement("tr");
    fila.className = "table-row";
    fila.dataset.codigo = producto.codigo;
    fila.innerHTML = `
      <td>${producto.id || "N/A"}</td>
      <td>${producto.codigo}</td>
      <td>${producto.cantidad}</td>
      <td>${producto.bodega || "N/A"}</td>
      <td>${producto.fecha}</td>
    `;
    tablaProductos.appendChild(fila);
  }

  function actualizarFilaTabla(codigo) {
    const producto = productosAgregados[codigo];
    const fila = tablaProductos.querySelector(`tr[data-codigo="${codigo}"]`);
    if (fila) {
      fila.cells[2].textContent = producto.cantidad;
      fila.cells[4].textContent = producto.fecha;
    }
  }

  async function guardarProductoYAgregarASesion(codigo, cantidad, caracteristica) {
  const id_sesion = parseInt(idSesionInput.value);

  const bodyData = {
    codigo: codigo,
    caracteristica:
      !caracteristicasInput.disabled && caracteristica !== "N/A"
        ? caracteristica
        : "N/A",
  };

  try {
    // 1. Crear el producto
    await fetch("http://localhost:4000/product/crear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(bodyData),
    });
  } catch (error) {
    console.warn("Producto posiblemente ya existe:", error.message);
  }

  try {
    // 2. Agregar a la sesión
    const response = await fetch("http://localhost:4000/product/agregar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        id_sesion,
        codigo_producto: codigo,
        cantidad,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      const esNuevo = !productosAgregados[codigo];
      if (esNuevo) {
        productosAgregados[codigo] = {
          codigo,
          cantidad,
          fecha: obtenerFechaFormateada(),
        };
        agregarFilaTabla(productosAgregados[codigo]);
        actualizarContadorTotal();
      } else {
        productosAgregados[codigo].cantidad += cantidad;
        productosAgregados[codigo].fecha = obtenerFechaFormateada();
        actualizarFilaTabla(codigo);
      }

      codigoProductoInput.value = "";
      cantidadInput.value = "";
      caracteristicasInput.value = "N/A";
      codigoProductoInput.focus();
    } else {
      alert(result?.mensaje || "Error al agregar producto a la sesión");
    }
  } catch (error) {
    console.error("Error agregando producto a la sesión:", error);
    alert("Error interno del servidor.");
  }
}

  function manejarAgregarProducto() {
    const codigo = codigoProductoInput.value.trim();
    const cantidad = parseInt(cantidadInput.value.trim()) || 1;
    const caracteristica = caracteristicasInput.value;

    if (!codigo || !caracteristica || caracteristica === "Selecciona") {
      alert("Todos los campos son obligatorios.");
      return;
    }

    guardarProductoYAgregarASesion(codigo, cantidad, caracteristica);
  }

  codigoProductoInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      manejarAgregarProducto();
    }
  });

  cantidadInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      manejarAgregarProducto();
    }
  });

  document.getElementById("formProducto").addEventListener("submit", function (e) {
    e.preventDefault();
    manejarAgregarProducto();
  });
});

document.getElementById("cerrarSesion").addEventListener("click", async function () {
  const id_sesion = localStorage.getItem("id_sesion");

  if (!id_sesion) {
    alert("No hay una sesión activa para finalizar.");
    window.location.href = "/sesion";
    return;
  }

  const confirmar = confirm("¿Estás seguro de que deseas finalizar esta sesión?");
  if (!confirmar) return;

  try {
    const response = await fetch("http://localhost:4000/product/finalizar", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ id_sesion: parseInt(id_sesion) })
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.mensaje || "Sesión finalizada correctamente.");
      localStorage.removeItem("id_sesion"); // Limpia la sesión actual
      window.location.href = "/sesion";     // Redirige después
    } else {
      alert(data.error || "No se pudo finalizar la sesión.");
    }
  } catch (error) {
    console.error("Error al finalizar la sesión:", error);
    alert("Ocurrió un error al finalizar la sesión.");
  }
});


