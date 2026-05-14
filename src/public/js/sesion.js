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
    const response = await fetch("http://192.168.1.13:4000/bode/mostrar");
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
    alert("Todos los campos obligatorios deben estar completos.");
    return;
  }

  try {
    const response = await fetch("http://192.168.1.13:4000/product/inicio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        id_bodega: parseInt(id_bodega),
        nombre_usuario: nombre_usuario, // <-- aquí el nombre
        observaciones: observaciones.trim(),
      }),
    });

    const result = await response.json();
    console.log("Respuesta del servidor:", result);

    if (response.ok && result?.body?.id_sesion) {
      alert(result.body.mensaje || "Sesión iniciada");

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
      alert(mensajeError);
    }
  } catch (error) {
    console.error("Error al enviar datos:", error);
    alert("Hubo un error al iniciar la sesión.");
  }
});


redirigir("consultas");
redirigir("transferencia");
redirigir("sesion");
});