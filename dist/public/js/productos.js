/* ============================================================
 * productos.js — Listado de la tabla `productos`
 *
 * Vista de solo lectura con paginación en servidor (/product/listar),
 * búsqueda por código/característica y filtro por estado. El total de
 * coincidencias llega en la cabecera X-Total-Count.
 * ============================================================ */

let productos = [];
let paginaActual = 1;
let productosPorPagina = 20;
let totalCoincidencias = 0;
let busquedaActual = "";
let estadoActual = "";
let temporizadorBusqueda = null;

function esc(valor) {
  if (typeof window.escapeHtml === "function") return window.escapeHtml(valor);
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function avisar(mensaje, tipo) {
  if (typeof window.toast === "function") window.toast(mensaje, tipo || "info");
  else console.log(mensaje);
}

function configurarNavegacion() {
  ["adminUsuario", "bodegas", "productos", "historial", "importarNav"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.addEventListener("change", () => {
      if (select.value) window.location.href = select.value;
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.verificarTokenAlCargar === "function") {
    window.verificarTokenAlCargar();
  }

  configurarNavegacion();
  cargarProductos();

  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      productosPorPagina = parseInt(e.target.value, 10);
      paginaActual = 1;
      cargarProductos();
    });
  }

  const clearSearchBtn = document.getElementById("clearSearch");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      document.getElementById("buscar").value = "";
      busquedaActual = "";
      paginaActual = 1;
      cargarProductos();
      clearSearchBtn.style.display = "none";
    });
  }

  const filtroEstado = document.getElementById("filtroEstado");
  if (filtroEstado) {
    filtroEstado.addEventListener("change", (e) => {
      estadoActual = e.target.value;
      paginaActual = 1;
      cargarProductos();
    });
  }
});

async function cargarProductos() {
  mostrarLoading(true);

  try {
    const params = new URLSearchParams({
      page: paginaActual,
      limit: productosPorPagina,
    });

    if (busquedaActual) params.set("buscar", busquedaActual);
    if (estadoActual) params.set("estado", estadoActual);

    const { cuerpo, respuesta } = await apiFetch(
      `/product/listar?${params.toString()}`,
      { exponerRespuesta: true },
    );

    if (cuerpo && cuerpo.body && Array.isArray(cuerpo.body)) {
      productos = cuerpo.body;
      totalCoincidencias = leerTotal(respuesta);
    } else {
      productos = [];
      totalCoincidencias = 0;
      console.error("Formato de datos inválido:", cuerpo);
    }

    const totalPaginas = calcularTotalPaginas();
    if (productos.length === 0 && paginaActual > 1 && paginaActual > totalPaginas) {
      paginaActual = totalPaginas;
      return cargarProductos();
    }

    actualizarStats();
    mostrarTabla(productos);
    actualizarPaginador(totalPaginas);
  } catch (error) {
    console.error("Error al cargar productos:", error);
    avisar("Error al cargar los productos", "error");
    const tabla = document.getElementById("tablaProductos");
    if (tabla) {
      tabla.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#ff4d4f;"></i>
                <p>Error al cargar los datos. Verifique la conexión con el servidor.</p>
            </td></tr>`;
    }
  } finally {
    mostrarLoading(false);
  }
}

function leerTotal(respuesta) {
  const cabecera = respuesta?.headers?.get("X-Total-Count");

  if (cabecera !== null && cabecera !== undefined && cabecera !== "") {
    const total = parseInt(cabecera, 10);
    if (Number.isFinite(total)) return total;
  }

  return productos.length;
}

function calcularTotalPaginas() {
  return Math.ceil(totalCoincidencias / productosPorPagina);
}

function actualizarStats() {
  const totalCount = document.getElementById("totalCount");
  const totalItems = document.getElementById("totalItems");
  if (totalCount) totalCount.textContent = totalCoincidencias;
  if (totalItems) totalItems.textContent = totalCoincidencias;
}

function mostrarTabla(lista) {
  const tabla = document.getElementById("tablaProductos");
  if (!tabla) return;

  if (!lista || lista.length === 0) {
    tabla.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;padding:40px">
                No hay productos para mostrar
            </td>
        </tr>`;
    return;
  }

  tabla.innerHTML = lista
    .map((p) => {
      const activo = p.estado === "ACTIVO";
      return `
        <tr>
            <td>${esc(p.id_producto) || "-"}</td>
            <td><strong>${esc(p.codigo) || "-"}</strong></td>
            <td>${esc(p.caracteristica) || "-"}</td>
            <td>${p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString("es-ES") : "-"}</td>
            <td>
                <span class="status-badge ${activo ? "status-active" : "status-inactive"}">
                    <i class="fas ${activo ? "fa-check-circle" : "fa-ban"}"></i>
                    ${activo ? "Activo" : "Inactivo"}
                </span>
            </td>
        </tr>`;
    })
    .join("");
}

function actualizarPaginador(totalPaginas) {
  const startRange = document.getElementById("startRange");
  const endRange = document.getElementById("endRange");
  const pageNumbers = document.getElementById("pageNumbers");
  const btnFirst = document.getElementById("btnFirst");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnLast = document.getElementById("btnLast");

  const inicio =
    totalCoincidencias === 0 ? 0 : (paginaActual - 1) * productosPorPagina + 1;
  const fin = Math.min(paginaActual * productosPorPagina, totalCoincidencias);

  if (startRange) startRange.textContent = inicio;
  if (endRange) endRange.textContent = fin;

  if (btnFirst) btnFirst.disabled = paginaActual === 1;
  if (btnPrev) btnPrev.disabled = paginaActual === 1;
  if (btnNext) btnNext.disabled = paginaActual === totalPaginas || totalPaginas === 0;
  if (btnLast) btnLast.disabled = paginaActual === totalPaginas || totalPaginas === 0;

  if (pageNumbers) {
    pageNumbers.innerHTML = "";
    const maxVisible = 5;
    let startPage = Math.max(1, paginaActual - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPaginas, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-number ${i === paginaActual ? "active" : ""}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => irPagina(i);
      pageNumbers.appendChild(pageBtn);
    }
  }
}

function irPagina(pagina) {
  const totalPaginas = calcularTotalPaginas();
  if (pagina < 1 || pagina > totalPaginas) return;
  paginaActual = pagina;
  cargarProductos();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function paginaAnterior() {
  if (paginaActual > 1) irPagina(paginaActual - 1);
}

function paginaSiguiente() {
  if (paginaActual < calcularTotalPaginas()) irPagina(paginaActual + 1);
}

function irPrimeraPagina() {
  irPagina(1);
}

function irUltimaPagina() {
  irPagina(calcularTotalPaginas());
}

function mostrarLoading(mostrar) {
  if (!mostrar) return;
  const tabla = document.getElementById("tablaProductos");
  if (tabla) {
    tabla.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="loading-spinner"></div>Cargando productos...</td></tr>`;
  }
}

document.getElementById("buscar")?.addEventListener("input", (e) => {
  const texto = e.target.value;
  const clearBtn = document.getElementById("clearSearch");

  if (clearBtn) clearBtn.style.display = texto ? "flex" : "none";

  if (temporizadorBusqueda) clearTimeout(temporizadorBusqueda);

  temporizadorBusqueda = setTimeout(() => {
    busquedaActual = texto.trim();
    paginaActual = 1;
    cargarProductos();
  }, 300);
});
