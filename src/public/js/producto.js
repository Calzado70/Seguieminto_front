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

async function cargarBodegas() {
  const selectBodega = document.getElementById("id_bodega");

  try {
    const response = await fetch("http://localhost:4000/bode/mostrar");
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      selectBodega.innerHTML = '<option value="">Seleccione bodega</option>';
      result.data.forEach((bodega) => {
        const option = document.createElement("option");
        option.value = bodega.id_bodega;
        option.textContent = bodega.nombre;
        selectBodega.appendChild(option);
      });
    } else {
      console.error("Estructura de respuesta inesperada:", result);
      selectBodega.innerHTML =
        '<option value="">Error cargando bodegas</option>';
    }
  } catch (error) {
    console.error("Error al cargar bodegas:", error);
    selectBodega.innerHTML =
      '<option value="">Error al cargar bodegas</option>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  verificarTokenAlCargar();
  cargarBodegas();

  const usuario = localStorage.getItem("usuario_nombre");
  const bodega = localStorage.getItem("usuario_bodega");

  if (usuario) {
    document.getElementById("usuario").value = usuario;
  }
  if (bodega) {
    document.getElementById("bodegaActual").value = bodega;
    mostrarInventarioPorNombre(bodega); // ✅ Llama a la función correctamente
  }

  document
    .getElementById("id_bodega")
    .addEventListener("change", (e) => {
      const nombreBodega = e.target.options[e.target.selectedIndex].text;
      mostrarInventarioPorNombre(nombreBodega);
    });

  document
    .getElementById("confirmarMovimiento")
    .addEventListener("click", transferirProducto);
});

// ✅ Define la función antes de usarla
async function mostrarInventarioPorNombre(nombreBodega) {
  console.log("📦 Nombre de bodega recibido:", nombreBodega);

  try {
    const response = await fetch(
      `http://localhost:4000/product/inventario?nombre_bodega=${encodeURIComponent(nombreBodega)}`
    );

    const result = await response.json();

    console.log("🧾 Resultado del inventario:", result);

    const inventario = result.body;

    const contenedor = document.querySelector(".cont-segun-formu");
    const filasAnteriores = contenedor.querySelectorAll(".table-row");
    filasAnteriores.forEach((row) => row.remove());

    if (Array.isArray(inventario) && inventario.length > 0) {
      inventario.forEach((producto) => {
        const row = document.createElement("div");
        row.classList.add("table-row");

        row.innerHTML = `
          <span>${producto.codigo}</span>
          <span>${nombreBodega}</span>
          <span>${producto.cantidad_disponible}</span>
          <span>${new Date(producto.fecha_actualizacion).toLocaleDateString()}</span>
          <span>
            <button onclick="abrirModalTransferencia('${producto.codigo}', '${nombreBodega}')">Mover</button>
          </span>
        `;
        contenedor.appendChild(row);
      });
    } else {
      alert("No se encontró inventario para la bodega.");
    }
  } catch (error) {
    console.error("❗ Error al consultar inventario:", error);
    alert("Error al consultar inventario.");
  }
}

async function mostrarInventarioBodega() {
  const select = document.getElementById("id_bodega");
  const bodegaNombre = select.options[select.selectedIndex].textContent;
  if (!bodegaNombre) return;
  mostrarInventarioPorNombre(bodegaNombre); // usa la función que sí está definida
}


// Abre modal para mover producto
function abrirModalTransferencia(codigo, idBodegaOrigen) {
  document.getElementById("productoMovimiento").textContent = codigo;
  document.getElementById("bodegaOrigen").textContent = idBodegaOrigen;
  document.getElementById("modalMovimiento").style.display = "block";
}

// Ejecuta la transferencia
async function transferirProducto() {
  const codigo = document.getElementById("productoMovimiento").textContent;
  const bodegaOrigen = document.getElementById("bodegaOrigen").textContent;
  const bodegaDestino = document.getElementById("id_bodega").value;
  const observaciones = document.getElementById("observaciones").value;
  const usuario = document.getElementById("usuario").value;
  const tipo = document.getElementById("tipoMovimientoSelect").value;

  if (!codigo || !bodegaOrigen || !bodegaDestino || !usuario || !tipo) {
    alert("Todos los campos son obligatorios para mover producto");
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/product/transferencia", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id_bodega_origen: bodegaOrigen,
        id_bodega_destino: bodegaDestino,
        codigo_producto: codigo,
        cantidad: 1, // Aquí puedes hacerlo dinámico si necesitas
        id_usuario: usuario,
        observaciones: observaciones || tipo // puedes concatenar tipo
      })
    });

    const result = await response.json();
    if (result.mensaje) {
      alert(result.mensaje);
      document.getElementById("modalMovimiento").style.display = "none";
      mostrarInventarioBodega(); // Recargar inventario
    } else {
      alert("Error al mover producto");
    }
  } catch (err) {
    console.error("Error al transferir:", err);
    alert("Error en el servidor al mover el producto");
  }
}
