let productos = [];
let editando = null;
let paginaActual = 1;
let productosPorPagina = 20;
let productosFiltrados = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo();

  // Event listener para cambiar cantidad por página
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      productosPorPagina = parseInt(e.target.value);
      paginaActual = 1;
      aplicarFiltroYPaginacion();
    });
  }

  // Event listener para limpiar búsqueda
  const clearSearchBtn = document.getElementById("clearSearch");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      document.getElementById("buscar").value = "";
      aplicarFiltroYPaginacion();
      clearSearchBtn.style.display = "none";
    });
  }
});

async function cargarCatalogo() {
  mostrarLoading(true);
  try {
    const res = await fetch("http://192.168.1.13:4000/catalogo/listar");
    const data = await res.json();
    console.log("Respuesta API:", data);

    if (data.body && Array.isArray(data.body)) {
      productos = data.body;
    } else {
      productos = [];
      console.error("Formato de datos inválido:", data);
    }

    actualizarStats();
    aplicarFiltroYPaginacion();
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

function actualizarStats() {
  const totalCount = document.getElementById("totalCount");
  const totalItems = document.getElementById("totalItems");
  if (totalCount) totalCount.textContent = productos.length;
  if (totalItems) totalItems.textContent = productos.length;
}

function aplicarFiltroYPaginacion() {
  const textoBusqueda =
    document.getElementById("buscar")?.value.toLowerCase() || "";
  const clearBtn = document.getElementById("clearSearch");

  if (clearBtn) {
    clearBtn.style.display = textoBusqueda ? "flex" : "none";
  }

  // Filtrar productos
  if (textoBusqueda) {
    productosFiltrados = productos.filter(
      (p) =>
        (p.codigo_barras &&
          p.codigo_barras.toLowerCase().includes(textoBusqueda)) ||
        (p.sku && p.sku.toLowerCase().includes(textoBusqueda)) ||
        (p.referencia && p.referencia.toLowerCase().includes(textoBusqueda)),
    );
  } else {
    productosFiltrados = [...productos];
  }

  const totalItemsSpan = document.getElementById("totalItems");
  if (totalItemsSpan) totalItemsSpan.textContent = productosFiltrados.length;

  // Calcular paginación
  const totalPaginas = Math.ceil(
    productosFiltrados.length / productosPorPagina,
  );
  if (paginaActual > totalPaginas) paginaActual = Math.max(1, totalPaginas);

  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;
  const productosPagina = productosFiltrados.slice(inicio, fin);

  mostrarTabla(productosPagina);
  actualizarPaginador(totalPaginas);
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

  const inicio = (paginaActual - 1) * productosPorPagina + 1;
  const fin = Math.min(
    paginaActual * productosPorPagina,
    productosFiltrados.length,
  );

  if (startRange)
    startRange.textContent = productosFiltrados.length === 0 ? 0 : inicio;
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
  const totalPaginas = Math.ceil(
    productosFiltrados.length / productosPorPagina,
  );
  if (pagina < 1 || pagina > totalPaginas) return;
  paginaActual = pagina;
  aplicarFiltroYPaginacion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function paginaAnterior() {
  if (paginaActual > 1) {
    irPagina(paginaActual - 1);
  }
}

function paginaSiguiente() {
  const totalPaginas = Math.ceil(
    productosFiltrados.length / productosPorPagina,
  );
  if (paginaActual < totalPaginas) {
    irPagina(paginaActual + 1);
  }
}

function mostrarLoading(mostrar) {
  if (!mostrar) return;
  const tabla = document.getElementById("tablaCatalogo");
  if (tabla && productos.length === 0) {
    tabla.innerHTML = `<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div>Cargando productos...</td></tr>`;
  }
}

function mostrarToast(mensaje, tipo = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  if (toast && toastMessage) {
    toastMessage.textContent = mensaje;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  } else {
    alert(mensaje);
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Event listener para búsqueda
document.getElementById("buscar")?.addEventListener("input", (e) => {
  paginaActual = 1;
  aplicarFiltroYPaginacion();
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
  let url = "http://192.168.1.13:4000/catalogo/crear";
  let metodo = "POST";

  if (editando) {
    body.id_catalogo = editando;
    url = "http://192.168.1.13:4000/catalogo/actualizar";
    metodo = "PUT";
  }

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
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


const url = estadoActual === "ACTIVO"

?
"http://192.168.1.13:4000/catalogo/inhabilitar"

:

"http://192.168.1.13:4000/catalogo/activar";



try{


const res = await fetch(url,{

method:"PUT",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

id_catalogo:id

})


});



const data=await res.json();



alert(data.mensaje);



cargarCatalogo();



}catch(error){


console.error(error);


alert("Error cambiando estado");


}


}
