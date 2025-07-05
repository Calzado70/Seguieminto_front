function openTab(tabId) {
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.querySelector(`.tab[onclick*="${tabId}"]`).classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    async function consultarInventario() {
      const id_bodega = document.getElementById('inv_bodega').value;
      const res = await fetch('/rutaProducto/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_bodega })
      });
      const data = await res.json();
      document.getElementById('inv_resultado').textContent = JSON.stringify(data, null, 2);
    }

    async function consultarStock() {
      const codigo_producto = document.getElementById('stock_codigo').value;
      const res = await fetch('/rutaProducto/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_producto })
      });
      const data = await res.json();
      document.getElementById('stock_resultado').textContent = JSON.stringify(data, null, 2);
    }

    async function consultarMovimientos() {
      const id_bodega = document.getElementById('mov_bodega').value;
      const fecha_inicio = document.getElementById('mov_inicio').value;
      const fecha_fin = document.getElementById('mov_fin').value;
      const res = await fetch('/rutaProducto/movi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_bodega, fecha_inicio, fecha_fin })
      });
      const data = await res.json();
      document.getElementById('mov_resultado').textContent = JSON.stringify(data, null, 2);
    }

    async function consultarDetalleSesion() {
      const id_sesion = document.getElementById('detalle_sesion').value;
      const res = await fetch('/rutaProducto/detalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_sesion })
      });
      const data = await res.json();
      document.getElementById('detalle_resultado').textContent = JSON.stringify(data, null, 2);
    }