// ===== NAVEGACIÓN =====
function redirigir(selectId) {
  const selectElement = document.getElementById(selectId);
  if (!selectElement) return;
  selectElement.addEventListener("change", function () {
    const selectedOption = selectElement.value;
    if (selectedOption) {
      window.location.href = selectedOption;
    }
  });
}

function irAVistaAlertas() {
  window.location.href = "/alerta";
}

// ===== ESTADO DE SESIÓN =====
function verificarTokenAlCargar() {
  const userData = JSON.parse(localStorage.getItem("userData")) || {};
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  document.getElementById("currentUserName").textContent =
    userData.nombre || "Usuario";
  document.getElementById("currentUserRole").textContent =
    userData.rol || "Rol";
}

// ===== VARIABLES GLOBALES =====
let caracteristicaEditando = null;
let caracteristicasData = [];

// ===== CREAR =====
document
  .getElementById("caracteristicaForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const valor = document.getElementById("valorCaracteristica").value;

    if (!valor || valor.trim() === "") {
      showToast("El valor es obligatorio", "error");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/caracter/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor }),
      });

      const data = await res.json();

      if (data.error) {
        showToast(data.error, "error");
        return;
      }

      document.getElementById("valorCaracteristica").value = "";
      showToast("Característica creada correctamente", "success");
      cargarCaracteristicas();
    } catch (err) {
      console.error(err);
      showToast("Error al crear característica", "error");
    }
  });

// ===== LISTAR =====
async function cargarCaracteristicas() {
  try {
    const res = await fetch("http://localhost:4000/caracter/listar");
    const data = await res.json();

    caracteristicasData = data.body || [];
    renderTabla(caracteristicasData);
  } catch (err) {
    console.error("Error al cargar características:", err);
  }
}

function renderTabla(lista) {
  const tbody = document.getElementById("caracteristicasTableBody");
  const filtro = document
    .getElementById("caracteristicaSearch")
    ?.value.toLowerCase();

  const filtradas = filtro
    ? lista.filter((c) => c.valor.toLowerCase().includes(filtro))
    : lista;

  tbody.innerHTML = filtradas
    .map(
      (c) => `
        <tr>
          <td>${c.id}</td>
          <td><strong>${c.valor}</strong></td>
          <td>
            <span class="status-badge ${
              c.estado === "ACTIVA" ? "status-active" : "status-inactive"
            }">
              ${c.estado}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              <button class="action-btn edit" onclick="editarCaracteristica(${c.id})" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete" onclick="eliminarCaracteristica(${c.id})" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  if (filtradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
          No hay características
        </td>
      </tr>
    `;
  }
}

// ===== BUSCAR =====
document
  .getElementById("caracteristicaSearch")
  .addEventListener("input", () => {
    renderTabla(caracteristicasData);
  });

// ===== EDITAR =====
function editarCaracteristica(id) {
  const caracteristica = caracteristicasData.find((c) => c.id === id);
  if (!caracteristica) return;

  caracteristicaEditando = caracteristica;
  document.getElementById("editarValor").value = caracteristica.valor;
  document.getElementById("editarEstado").value = caracteristica.estado;
  document.getElementById("modalEditar").style.display = "flex";
}

async function guardarEdicion() {
  if (!caracteristicaEditando) return;

  const valor = document.getElementById("editarValor").value;
  const estado = document.getElementById("editarEstado").value;

  if (!valor || valor.trim() === "") {
    showToast("El valor es obligatorio", "error");
    return;
  }

  try {
    const res = await fetch("http://localhost:4000/caracter/modificar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: caracteristicaEditando.id,
        valor,
        estado,
      }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    cerrarModal();
    showToast("Característica modificada correctamente", "success");
    cargarCaracteristicas();
  } catch (err) {
    console.error(err);
    showToast("Error al modificar característica", "error");
  }
}

function cerrarModal() {
  caracteristicaEditando = null;
  document.getElementById("modalEditar").style.display = "none";
}

// ===== ELIMINAR =====
async function eliminarCaracteristica(id) {
  if (!confirm("¿Está seguro de eliminar esta característica?")) return;

  try {
    const res = await fetch("http://localhost:4000/caracter/eliminar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    showToast("Característica eliminada correctamente", "success");
    cargarCaracteristicas();
  } catch (err) {
    console.error(err);
    showToast("Error al eliminar característica", "error");
  }
}

// ===== TOAST =====
function showToast(mensaje, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== INICIALIZACIÓN =====
document.addEventListener("DOMContentLoaded", () => {
  verificarTokenAlCargar();
  cargarCaracteristicas();
  redirigir("adminUsuario");
  redirigir("bodegas");
  redirigir("productos");
  redirigir("historial");
});