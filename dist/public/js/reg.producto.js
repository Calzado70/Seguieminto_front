document.addEventListener("DOMContentLoaded", function () {
  verificarTokenAlCargar();

  const codigoProductoInput = document.getElementById("codigo_producto");
  const cantidadInput = document.getElementById("cantidad");
  const tablaProductos = document.getElementById("tablaProductos");
  const totalProductosSpan = document.getElementById("totalProductos");
  const idSesionInput = document.getElementById("id_sesion");
  const nombre_bodega = localStorage.getItem("nombre_bodega");

  // 🔒 MODO INDUSTRIAL
  codigoProductoInput.setAttribute("autocomplete", "new-password");
  codigoProductoInput.focus();

  codigoProductoInput.addEventListener("blur", () => {
  setTimeout(() => {
    if (document.activeElement !== cantidadInput) {
      codigoProductoInput.focus();
    }
  }, 50);
});

  const idSesionGuardado = localStorage.getItem("id_sesion");
  if (idSesionGuardado) {
    idSesionInput.value = idSesionGuardado;
    idSesionInput.readOnly = true;
  }

  let productosAgregados = {};

  // Cargar productos guardados si existen
  const productosGuardados = localStorage.getItem("productosAgregados");
  if (productosGuardados) {
    productosAgregados = JSON.parse(productosGuardados);
    for (const codigo in productosAgregados) {
      agregarFilaTabla(productosAgregados[codigo]);
    }
    actualizarContadorTotal();
  }

  function guardarEnLocalStorage() {
    localStorage.setItem("productosAgregados", JSON.stringify(productosAgregados));
  }

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
      <td>${escapeHtml(producto.codigo)}</td>
      <td>${escapeHtml(producto.cantidad)}</td>
      <td>${escapeHtml(producto.nombre_bodega || "N/A")}</td>
      <td>${escapeHtml(producto.fecha)}</td>
      <td><button class="btn-eliminar" data-codigo="${producto.codigo}">❌</button></td>
    `;
    tablaProductos.appendChild(fila);
  }

  function actualizarFilaTabla(codigo) {
    const producto = productosAgregados[codigo];
    const fila = tablaProductos.querySelector(`tr[data-codigo="${codigo}"]`);
    if (fila) {
      fila.cells[1].textContent = producto.cantidad;
      fila.cells[3].textContent = producto.fecha;
    }
  }

  async function guardarProductoYAgregarASesion(codigo, cantidad) {
  const id_sesion = parseInt(idSesionInput.value);

  try {
    const result = await apiFetch("/product/agregar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_sesion,
        codigo_producto: codigo,
        cantidad,
      }),
    });

    const esNuevo = !productosAgregados[codigo];

    if (esNuevo) {

      productosAgregados[codigo] = {
        codigo,
        cantidad,
        fecha: obtenerFechaFormateada(),
        nombre_bodega,
      };

      agregarFilaTabla(productosAgregados[codigo]);

      actualizarContadorTotal();

    } else {

      productosAgregados[codigo].cantidad += cantidad;

      productosAgregados[codigo].fecha =
        obtenerFechaFormateada();

      actualizarFilaTabla(codigo);

    }

    guardarEnLocalStorage();

    codigoProductoInput.value = "";

    cantidadInput.value = "";

    codigoProductoInput.focus();

  } catch (error) {

    console.error("Error agregando producto:", error);

    toast(error.message || "Error interno del servidor", "error");

  }
}

  function manejarAgregarProducto() {
    const codigo = codigoProductoInput.value.trim();
    const cantidad = parseInt(cantidadInput.value.trim()) || 1;

    if (!codigo) {
      toast("Todos los campos son obligatorios.", "warning");
      return;
    }

    guardarProductoYAgregarASesion(codigo, cantidad);
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

  // 🧹 Eliminar producto de la tabla y localStorage
  tablaProductos.addEventListener("click", async function (e) {
    if (e.target.classList.contains("btn-eliminar")) {
      const codigo = e.target.dataset.codigo;
      const confirmar = await trostConfirmar(
        `¿Eliminar el producto con código ${codigo}?`,
        { titulo: "Eliminar producto", textoConfirmar: "Eliminar", peligro: true }
      );
      if (confirmar) {
        delete productosAgregados[codigo];
        guardarEnLocalStorage();
        e.target.closest("tr").remove();
        actualizarContadorTotal();
      }
    }
  });
});

document.getElementById("cerrarSesion").addEventListener("click", async function () {
  const id_sesion = localStorage.getItem("id_sesion");

  if (!id_sesion) {
    toast("No hay una sesión activa para finalizar.", "warning");
    window.location.href = "/sesion";
    return;
  }

  const confirmar = await trostConfirmar(
      "¿Estás seguro de que deseas finalizar esta sesión?",
      { titulo: "Finalizar sesión", textoConfirmar: "Finalizar", peligro: true }
    );
  if (!confirmar) return;

  try {
    const data = await apiFetch("/product/finalizar", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id_sesion: parseInt(id_sesion) })
    });

    toast(data.mensaje || "Sesión finalizada correctamente.", "success");
    localStorage.removeItem("id_sesion");
    localStorage.removeItem("productosAgregados"); // Limpia productos tambiǸn
    window.location.href = "/sesion";
  } catch (error) {
    console.error("Error al finalizar la sesión:", error);
    toast(error.message || "Ocurrió un error al finalizar la sesión.", "error");
  }
});


