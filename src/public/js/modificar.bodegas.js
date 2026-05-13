// Variables globales
let bodegaActual = {};

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

// Cargar datos de la bodega
async function cargarDatosBodega() {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const idBodega = urlParams.get('id');

    if (!idBodega) {
        showToast('No se especificó bodega a modificar', 'error');
        setTimeout(() => window.location.href = '/crear_bodega', 1500);
        return;
    }

    try {
        const response = await fetch(`http://localhost:4000/bode/mostrar?id=${idBodega}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error al obtener datos de la bodega');
        }

        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error('Bodega no encontrada');
        }

        bodegaActual = result.data[0];
        document.getElementById('idBodega').value = bodegaActual.id_bodega;
        document.getElementById('nombre').value = bodegaActual.nombre || '';
        document.getElementById('capacidad').value = bodegaActual.capacidad || '';
        document.getElementById('estado').value = bodegaActual.estado || 'ACTIVA';

    } catch (error) {
        console.error('Error al cargar bodega:', error);
        showToast(`Error: ${error.message}`, 'error');
        setTimeout(() => window.location.href = '/crear_bodega', 1500);
    }
}

// Modificar bodega
async function modificarBodega() {
    const btnGuardar = document.getElementById('guardar');
    const originalText = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No hay sesión activa');

        const idBodega = document.getElementById('idBodega').value;
        const nombre = document.getElementById('nombre').value.trim();
        const capacidad = parseFloat(document.getElementById('capacidad').value);
        const estado = document.getElementById('estado').value;

        // Validaciones
        if (!idBodega) throw new Error('ID de bodega no especificado');
        if (!nombre || nombre.length < 3) throw new Error('Nombre debe tener al menos 3 caracteres');
        if (isNaN(capacidad) || capacidad <= 0) throw new Error('Capacidad debe ser un número positivo');

        const bodegaData = {
            id_bodega: idBodega,
            nombre,
            capacidad,
            estado
        };

        showToast('Actualizando bodega...', 'info');

        const response = await fetch('http://localhost:4000/bode/modificar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodegaData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al modificar bodega');
        }

        showToast('Bodega modificada correctamente', 'success');
        setTimeout(() => {
            window.location.href = '/crear_bodega';
        }, 1500);

    } catch (error) {
        console.error('Error en modificarBodega:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = originalText;
    }
}

// Función para mostrar notificaciones toast
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

// Cancelar y volver
function cancelarEdicion() {
    window.location.href = '/crear_bodega';
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarDatosBodega();
    
    // Event listeners
    document.getElementById('guardar').addEventListener('click', modificarBodega);
    document.getElementById('cancelar').addEventListener('click', cancelarEdicion);
    
    // Redirecciones
    document.getElementById('adminUsuario').addEventListener('change', function() {
        if (this.value) window.location.href = this.value;
    });
    
    document.getElementById('bodegas').addEventListener('change', function() {
        if (this.value) window.location.href = this.value;
    });
    
    document.getElementById('historial').addEventListener('change', function() {
        if (this.value) window.location.href = this.value;
    });
});