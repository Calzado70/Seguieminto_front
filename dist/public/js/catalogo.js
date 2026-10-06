let productos = [];
let editando = null;
let paginaActual = 1;
let productosPorPagina = 20;
let totalCoincidencias = 0;
let busquedaActual = "";
let temporizadorBusqueda = null;

document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo();

  // Event listener para cambiar cantidad por página
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      productosPorPagina = parseInt(e.target.value);
      paginaActual = 1;
      cargarCatalogo();
    });
  }

  // Event listener para limpiar búsqueda
  const clearSearchBtn = document.getElementById("clearSearch");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      document.getElementById("buscar").value = "";
      busquedaActual = "";
      paginaActual = 1;
      cargarCatalogo();
      clearSearchBtn.style.display = "none";
    });
  }
});

async function cargarCatalogo() {
  mostrarLoading(true);

  try {
    const params = new URLSearchParams({
      page: paginaActual,
      limit: productosPorPagina,
    });

    if (busquedaActual) params.set("buscar", busquedaActual);

    const { cuerpo, respuesta } = await apiFetch(
      `/catalogo/listar?${params.toString()}`,
      { exponerRespuesta: true }
    );

    if (cuerpo && cuerpo.body && Array.isArray(cuerpo.body)) {
      productos = cuerpo.body;
      totalCoincidencias = leerTotal(respuesta);
    } else {
      productos = [];
      totalCoincidencias = 0;
      console.error("Formato de datos inválido:", cuerpo);
    }

    // Si la última página quedó vacía tras un filtro o un borrado, se
    // retrocede en lugar de mostrar una tabla sin filas.
    const totalPaginas = calcularTotalPaginas();
    if (productos.length === 0 && paginaActual > 1 && paginaActual > totalPaginas) {
      paginaActual = totalPaginas;
      return cargarCatalogo();
    }

    actualizarStats();
    mostrarTabla(productos);
    actualizarPaginador(totalPaginas);
  } catch (error) {
    console.error("Error al cargar catálogo:", error);
    mostrarToast("Error al cargar los productos", "error");
    const tabla = document.getElementById("tablaCatalogo");
    if (tabla) {
      tabla.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#ff4d4f;"></i>
                <p>Error al cargar los datos. Verifique la conexión con el servidor.</p>
            </td></tr>`;
    }
  } finally {
    mostrarLoading(false);
  }
}

/**
 * El total llega en X-Total-Count, expuesta en CORS por app.js. Si la
 * cabecera no viniera (proxy o versión antigua del backend), se cae al
 * largo de la página para que la interfaz siga siendo utilizable.
 */
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
  const tabla = document.getElementById("tablaCatalogo");

  if (!tabla) return;

  if (!lista || lista.length === 0) {
    tabla.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center;padding:40px">
                No hay productos para mostrar
            </td>
        </tr>`;

    return;
  }

  tabla.innerHTML = lista
    .map(
      (p) => `

        <tr>

            <td>${p.id_catalogo || "-"}</td>

            <td>
                <strong>${escapeHtml(p.referencia) || "-"}</strong>
            </td>

            <td>
                ${escapeHtml(p.sku) || "-"}
            </td>

            <td>
                ${escapeHtml(p.codigo_barras) || "-"}
            </td>


            <td>
                ${
                  p.fecha_creacion
                    ? new Date(p.fecha_creacion).toLocaleDateString("es-ES")
                    : "-"
                }
            </td>



            <td>

                <span class="status-badge 
                    ${
                      p.estado === "ACTIVO"
                        ? "status-active"
                        : "status-inactive"
                    }">


                    <i class="fas 
                    ${
                      p.estado === "ACTIVO" ? "fa-check-circle" : "fa-ban"
                    }"></i>


                    ${p.estado === "ACTIVO" ? "Activo" : "Inactivo"}


                </span>


            </td>



            <td>

                <div class="action-buttons">


                    <button 
                    class="btn-icon btn-edit"
                    onclick="editar(${p.id_catalogo})">

                        <i class="fas fa-edit"></i>

                    </button>



                    <button 
                    class="btn-icon btn-toggle"

                    onclick="cambiarEstado(${p.id_catalogo}, '${p.estado}')">


                        <i class="fas 
                        ${
                          p.estado === "ACTIVO"
                            ? "fa-toggle-on"
                            : "fa-toggle-off"
                        }"></i>


                    </button>


                </div>


            </td>


        </tr>


    `,
    )
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

  if (startRange) startRange.textContent = totalCoincidencias === 0 ? 0 : inicio;
  if (endRange) endRange.textContent = fin;

  // Habilitar/deshabilitar botones
  if (btnFirst) btnFirst.disabled = paginaActual === 1;
  if (btnPrev) btnPrev.disabled = paginaActual === 1;
  if (btnNext)
    btnNext.disabled = paginaActual === totalPaginas || totalPaginas === 0;
  if (btnLast)
    btnLast.disabled = paginaActual === totalPaginas || totalPaginas === 0;

  // Generar números de página
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
  cargarCatalogo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function paginaAnterior() {
  if (paginaActual > 1) {
    irPagina(paginaActual - 1);
  }
}

function paginaSiguiente() {
  if (paginaActual < calcularTotalPaginas()) {
    irPagina(paginaActual + 1);
  }
}

function irPrimeraPagina() {
  irPagina(1);
}

function irUltimaPagina() {
  irPagina(calcularTotalPaginas());
}

function mostrarLoading(mostrar) {
  if (!mostrar) return;
  const tabla = document.getElementById("tablaCatalogo");
  // Con paginación en servidor cada salto de página es una petición de
  // red, así que el spinner se muestra siempre, no solo en la carga inicial.
  if (tabla) {
    tabla.innerHTML = `<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div>Cargando productos...</td></tr>`;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Event listener para búsqueda. Se aplica un retardo para no lanzar una
// consulta por cada tecla: el filtro ahora vive en el servidor.
document.getElementById("buscar")?.addEventListener("input", (e) => {
  const texto = e.target.value;
  const clearBtn = document.getElementById("clearSearch");

  if (clearBtn) clearBtn.style.display = texto ? "flex" : "none";

  if (temporizadorBusqueda) clearTimeout(temporizadorBusqueda);

  temporizadorBusqueda = setTimeout(() => {
    busquedaActual = texto.trim();
    paginaActual = 1;
    cargarCatalogo();
  }, 300);
});

function abrirModal() {
  editando = null;
  const tituloModal = document.getElementById("tituloModal");
  if (tituloModal) {
    tituloModal.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo producto';
  }
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "flex";
  limpiar();
}

function cerrarModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
  limpiar();
}

function limpiar() {
  const referencia = document.getElementById("referencia");
  const sku = document.getElementById("sku");
  const codigo_barras = document.getElementById("codigo_barras");
  if (referencia) referencia.value = "";
  if (sku) sku.value = "";
  if (codigo_barras) codigo_barras.value = "";
}

async function guardar() {
  const referencia = document.getElementById("referencia")?.value;
  const sku = document.getElementById("sku")?.value;
  const codigo_barras = document.getElementById("codigo_barras")?.value;

  if (!referencia || !sku) {
    mostrarToast("Referencia y SKU son campos requeridos", "error");
    return;
  }

  let body = { referencia, sku, codigo_barras };
  let url = "/catalogo/crear";
  let metodo = "POST";

  if (editando) {
    body.id_catalogo = editando;
    url = "/catalogo/actualizar";
    metodo = "PUT";
  }

  try {
    const data = await apiFetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    mostrarToast(data.message || "Guardado correctamente");
    cerrarModal();
    await cargarCatalogo();
  } catch (error) {
    console.error("Error al guardar:", error);
    mostrarToast("Error al guardar el producto", "error");
  }
}

function editar(id) {
  const p = productos.find((x) => x.id_catalogo == id);
  if (!p) return;

  editando = id;
  const referencia = document.getElementById("referencia");
  const sku = document.getElementById("sku");
  const codigo_barras = document.getElementById("codigo_barras");
  const tituloModal = document.getElementById("tituloModal");

  if (referencia) referencia.value = p.referencia || "";
  if (sku) sku.value = p.sku || "";
  if (codigo_barras) codigo_barras.value = p.codigo_barras || "";
  if (tituloModal)
    tituloModal.innerHTML = '<i class="fas fa-edit"></i> Editar producto';

  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "flex";
}

async function cambiarEstado(id, estadoActual){
const url = estadoActual === "ACTIVO" ? "/catalogo/inhabilitar" : "/catalogo/activar";

try{

const data = await apiFetch(url,{

method:"PUT",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

id_catalogo:id

})

});



toast(data.mensaje, 'success');



cargarCatalogo();



}catch(error){


console.error(error);


toast("Error cambiando estado", "error");


}


}
