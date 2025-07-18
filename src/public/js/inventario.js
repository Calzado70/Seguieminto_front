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

  // Limpiar antes de consultar
  tbody.innerHTML = '';
  tabla.style.display = 'none';
  mensaje.textContent = '';

  if (!nombre_bodega) {
    mensaje.textContent = 'Por favor ingresa el nombre de la bodega';
    return;
  }

  try {
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
    } else {
      mensaje.textContent = data?.message || 'No se encontró inventario para la bodega.';
    }
  } catch (error) {
    console.error('❌ Error al consultar inventario:', error);
    mensaje.textContent = '❌ Error al consultar inventario.';
  }
}




async function cargarBodegas() {
  const select = document.getElementById('nombre_bodega');
  try {
    const res = await fetch('http://localhost:4000/bode/mostrar'); // Ajusta la ruta si es distinta
    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      data.data.forEach(bodega => {
        const option = document.createElement('option');
        option.value = bodega.nombre; // Este valor se usará en la consulta
        option.textContent = bodega.nombre;
        select.appendChild(option);
      });
    } else {
      console.warn('No se encontraron bodegas');
    }
  } catch (error) {
    console.error('Error al cargar bodegas:', error);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  cargarBodegas();
});