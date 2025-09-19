// Variables globales
let bodegasData = [];

// Verificar token al cargar
function verificarTokenAlCargar() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('currentUserName').textContent = payload.nombre || 'Usuario';
        document.getElementById('currentUserRole').textContent = payload.rol || 'Rol';
        
        const expiracion = payload.exp * 1000;
        if (Date.now() >= expiracion) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error al verificar el token:', error);
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

// Función para cambiar pestañas
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

    tbody.innerHTML = '';
    mensaje.textContent = '';
    mensaje.className = 'message';
    tabla.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `<i class="fas fa-spinner fa-spin"></i><p>Cargando inventario...</p>`;

    try {
        const token = localStorage.getItem('token');
        let url = `http://192.168.1.13:4000/product/inventario`;

        if (nombre_bodega) {
            url += `?nombre_bodega=${encodeURIComponent(nombre_bodega)}`;
        }

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Error al obtener inventario');
        }

        if (data && Array.isArray(data.body) && data.body.length > 0) {
            data.body.forEach(producto => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${producto.bodega}</td>
                    <td>${producto.codigo}</td>
                    <td>${producto.caracteristica}</td>
                    <td>${producto.cantidad_disponible}</td>
                    <td>${new Date(producto.fecha_actualizacion).toLocaleDateString()}</td>
                `;
                tbody.appendChild(row);
            });
            tabla.style.display = 'table';
            emptyState.style.display = 'none';
            showToast('Inventario cargado correctamente', 'success');
        } else {
            emptyState.innerHTML = `<i class="fas fa-box-open"></i><p>No se encontró inventario</p>`;
            mensaje.textContent = 'No se encontró inventario.';
            mensaje.classList.add('error');
        }
    } catch (error) {
        console.error('Error al consultar inventario:', error);
        emptyState.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>Error al cargar el inventario</p>`;
        mensaje.textContent = `Error: ${error.message}`;
        mensaje.classList.add('error');
    }
}


// Cargar bodegas
async function cargarBodegas() {
    const select = document.getElementById('nombre_bodega');
    try {
        // Mostrar estado de carga
        select.innerHTML = '<option value="">Cargando bodegas...</option>';
        select.disabled = true;

        const token = localStorage.getItem('token');
        const res = await fetch('http://192.168.1.13:4000/bode/mostrar', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();

        select.innerHTML = '<option value="">-- Seleccione --</option>';
        select.disabled = false;
        
        if (data.success && Array.isArray(data.data)) {
            bodegasData = data.data;
            data.data.forEach(bodega => {
                const option = document.createElement('option');
                option.value = bodega.nombre;
                option.textContent = bodega.nombre;
                select.appendChild(option);
            });
        } else {
            throw new Error(data.message || 'No se encontraron bodegas');
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
        select.innerHTML = '<option value="">Error al cargar bodegas</option>';
        showToast('Error al cargar bodegas', 'error');
    }
}

// Mostrar notificaciones toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Redirigir a vista de alertas
function irAVistaAlertas() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('No hay sesión activa. Por favor, inicia sesión.', 'error');
        window.location.href = '/';
        return;
    }
    window.location.href = '/alerta';
}

// Configurar redirecciones
function setupNavigation() {
    document.getElementById('adminUsuario').addEventListener('change', function() {
        if (this.value) window.location.href = this.value;
    });
    
    document.getElementById('bodegas').addEventListener('change', function() {
        if (this.value) window.location.href = this.value;
    });
    
    document.getElementById('historial').addEventListener('change', function() {
        if (this.value) window.location.href = this.value;
    });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarBodegas();
    setupNavigation();
    consultarInventario();
});