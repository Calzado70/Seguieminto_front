function openTab(tabId) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.querySelector(`.tab[onclick*="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

async function consultarInventario() {
  const nombre_bodega = document.getElementById('nombre_bodega').value.trim();
  const tabla = document.getElementById('tablaInventario');
  const tbody = tabla.querySelector('tbody');
  const mensaje = document.getElementById('mensajeInventario');
  const emptyState = document.getElementById('empty-state');

  // Limpiar antes de consultar
  tbody.innerHTML = '';
  mensaje.textContent = '';
  mensaje.className = 'message';
  emptyState.style.display = 'none';

  if (!nombre_bodega) {
    mensaje.textContent = 'Por favor seleccione una bodega';
    mensaje.classList.add('error');
    return;
  }

  try {
    // Mostrar estado de carga
    tabla.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `<i class="fas fa-spinner fa-spin"></i><p>Cargando inventario...</p>`;

    const res = await fetch(`http://localhost:4000/product/inventario?nombre_bodega=${encodeURIComponent(nombre_bodega)}`);
    const data = await res.json();

    if (data && Array.isArray(data.body) && data.body.length > 0) {
      data.body.forEach(producto => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${producto.codigo}</td>
          <td>${producto.caracteristica}</td>
          <td>${producto.cantidad_disponible}</td>
          <td>${producto.cantidad_reservada}</td>
          <td>${new Date(producto.fecha_actualizacion).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
      });
      tabla.style.display = 'table';
      emptyState.style.display = 'none';
    } else {
      emptyState.style.display = 'flex';
      emptyState.innerHTML = `<i class="fas fa-box-open"></i><p>No se encontró inventario para esta bodega</p>`;
      mensaje.textContent = data?.message || 'No se encontró inventario para la bodega seleccionada.';
      mensaje.classList.add('error');
    }
  } catch (error) {
    console.error('❌ Error al consultar inventario:', error);
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>Error al cargar el inventario</p>`;
    mensaje.textContent = '❌ Error al consultar inventario. Por favor intente nuevamente.';
    mensaje.classList.add('error');
  }
}

async function cargarBodegas() {
  const select = document.getElementById('nombre_bodega');
  try {
    // Mostrar estado de carga
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Cargando bodegas...';
    loadingOption.disabled = true;
    select.innerHTML = '';
    select.appendChild(loadingOption);

    const res = await fetch('http://localhost:4000/bode/mostrar');
    const data = await res.json();

    select.innerHTML = '<option value="">-- Seleccione --</option>';
    
    if (data.success && Array.isArray(data.data)) {
      data.data.forEach(bodega => {
        const option = document.createElement('option');
        option.value = bodega.nombre;
        option.textContent = bodega.nombre;
        select.appendChild(option);
      });
    } else {
      console.warn('No se encontraron bodegas');
      const errorOption = document.createElement('option');
      errorOption.value = '';
      errorOption.textContent = 'No se encontraron bodegas';
      errorOption.disabled = true;
      select.appendChild(errorOption);
    }
  } catch (error) {
    console.error('Error al cargar bodegas:', error);
    const errorOption = document.createElement('option');
    errorOption.value = '';
    errorOption.textContent = 'Error al cargar bodegas';
    errorOption.disabled = true;
    select.innerHTML = '';
    select.appendChild(errorOption);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarBodegas();
});