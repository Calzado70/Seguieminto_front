// Variables globales
let bodegaActual = {};

// Verificar token al cargar// Cargar datos de la bodega
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
    const result = await apiFetch(`/bode/mostrar?id=${idBodega}`);

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

        await apiFetch('/bode/modificar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodegaData)
        });

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
    
    document.getElementById('productos').addEventListener('change', function() {
        if (this.value) window.location.href = this.value;
    });
});