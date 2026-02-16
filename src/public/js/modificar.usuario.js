// Variables globales
let usuarioActual = {};

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

// Función para alternar visibilidad de contraseña
function togglePassword() {
    const passwordInput = document.getElementById('contrasena');
    const toggleIcon = document.getElementById('toggle-icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Cargar bodegas desde la API
async function cargarBodegas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://192.168.1.13:4000/bode/mostrar', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Error al cargar bodegas');
        
        const data = await response.json();
        const selectBodega = document.getElementById('bodega');
        
        // Limpiar select excepto la primera opción
        selectBodega.innerHTML = '<option value="">Seleccione bodega</option>';
        
        if (data.success && Array.isArray(data.data)) {
            data.data.forEach(bodega => {
                const option = document.createElement('option');
                option.value = bodega.id_bodega;
                option.textContent = bodega.nombre;
                selectBodega.appendChild(option);
            });
            
            // Si ya tenemos datos del usuario, seleccionar su bodega
            if (usuarioActual.id_bodega) {
                selectBodega.value = usuarioActual.id_bodega;
            }
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
        showToast('Error al cargar bodegas', 'error');
    }
}

// Cargar datos del usuario
async function cargarDatosUsuario() {
    const urlParams = new URLSearchParams(window.location.search);
    const nombreUsuario = urlParams.get('nombre');
    
    if (!nombreUsuario) {
        showToast('No se proporcionó un nombre de usuario', 'error');
        window.location.href = '/usuario';
        return;
    }

    document.getElementById('nombre').value = nombreUsuario;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://192.168.1.13:4000/user/mostrar?nombre=${encodeURIComponent(nombreUsuario)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.body && data.body.length > 0) {
                usuarioActual = data.body[0];
                // Actualizar el select de bodegas si ya se cargaron
                if (document.getElementById('bodega').options.length > 1) {
                    document.getElementById('bodega').value = usuarioActual.id_bodega || '';
                }
            }
        } else {
            throw new Error('Error al obtener datos del usuario');
        }
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        showToast('Error al cargar datos del usuario', 'error');
    }
}

// Modificar usuario
async function modificarUsuario() {
    const token = localStorage.getItem('token');
    const btnGuardar = document.getElementById('guardar');
    const originalText = btnGuardar.innerHTML;
    
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const usuarioData = {
            id_bodega: parseInt(document.getElementById('bodega').value),
            nombre: document.getElementById('nombre').value,
            contrasena: document.getElementById('contrasena').value
        };

        // Validación
        if (!usuarioData.id_bodega) throw new Error('Seleccione una bodega válida');
        if (usuarioData.contrasena && usuarioData.contrasena.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        showToast('Actualizando usuario...', 'info');

        const response = await fetch('http://192.168.1.13:4000/user/modificar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(usuarioData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'No se pudo modificar el usuario');
        }

        showToast('Usuario modificado correctamente', 'success');
        setTimeout(() => {
            window.location.href = '/usuario';
        }, 1500);
    } catch (error) {
        console.error('Error al modificar usuario:', error);
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
    window.location.href = '/usuario';
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarDatosUsuario().then(cargarBodegas);
    
    // Event listeners
    document.getElementById('guardar').addEventListener('click', modificarUsuario);
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