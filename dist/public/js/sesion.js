function redirigir(elementId) {
  const element = document.getElementById(elementId);
  
  if (element.tagName === 'SELECT') {
    element.addEventListener("change", function() {
      const selectedOption = element.options[element.selectedIndex].value;
      if (selectedOption) {
        window.location.href = selectedOption;
      }
    });
  } else if (element.tagName === 'BUTTON') {
    element.addEventListener("click", function() {
      window.location.href = element.value;
    });
  }
}


async function cargarBodegas() {
  const selectBodega = document.getElementById("id_bodega");

  try {
        const result = await apiFetch("/bode/mostrar");

    if (result.success && Array.isArray(result.data)) {
      selectBodega.innerHTML = '<option value="">Seleccione bodega</option>';
      result.data.forEach((bodega) => {
        const option = document.createElement("option");
        option.value = bodega.id_bodega;
        option.textContent = bodega.nombre;
        selectBodega.appendChild(option);
      });
      selectBodega.disabled = true;
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

async function rellenarCamposDesdeLocalStorage() {
  const nombreUsuario = localStorage.getItem("nombre");
  const idSesionBodega = localStorage.getItem("bodega");

  // Autocompletar campo usuario desde localStorage
  if (nombreUsuario) {
    const inputUsuario = document.getElementById("id_usuario");
    inputUsuario.value = nombreUsuario;
    inputUsuario.readOnly = true; // Si deseas que no se pueda editar
  }

  // Autocompletar campo bodega (una vez cargado el select)
  if (idSesionBodega) {
    const selectBodega = document.getElementById("id_bodega");
    const intentarSeleccionar = () => {
      const optionToSelect = selectBodega.querySelector(`option[value="${idSesionBodega}"]`);
      if (optionToSelect) {
        optionToSelect.selected = true;
      } else {
        setTimeout(intentarSeleccionar, 100); // Espera si aún no están cargadas las opciones
      }
    };
    intentarSeleccionar();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  verificarTokenAlCargar();
  cargarBodegas().then(() => rellenarCamposDesdeLocalStorage());

  const formSesion = document.getElementById("formSesion");

  formSesion.addEventListener("submit", async function (e) {
  e.preventDefault();

  const id_bodega = document.getElementById("id_bodega").value;

  const inputUsuario = document.getElementById("id_usuario");
  const nombre_usuario = inputUsuario.value.trim(); // <-- nombre ahora

  const observaciones = document.getElementById("observaciones").value;

  if (!id_bodega || !nombre_usuario) {
    toast("Todos los campos obligatorios deben estar completos.", "warning");
    return;
  }

  try {
    const result = await apiFetch("/product/inicio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_bodega: parseInt(id_bodega),
        nombre_usuario: nombre_usuario, // <-- aquí el nombre
        observaciones: observaciones.trim(),
      }),
    });

    if (result?.body?.id_sesion) {
      toast(result.body.mensaje || "Sesión iniciada", "success");

      // Guardar en localStorage
      localStorage.setItem("id_sesion", result.body.id_sesion);
      localStorage.setItem("nombre_usuario", nombre_usuario); // <-- Guardar el nombre
      localStorage.setItem("id_bodega", id_bodega);

      window.location.href = "/producto";
    } else {
      const mensajeError =
        result?.mensaje ||
        result?.message ||
        result?.error ||
        "No se pudo iniciar la sesión.";
      toast(mensajeError, "error");
    }
  } catch (error) {
    console.error("Error al enviar datos:", error);
    toast("Hubo un error al iniciar la sesión.", "error");
  }
});


redirigir("consultas");
redirigir("transferencia");
redirigir("sesion");
});