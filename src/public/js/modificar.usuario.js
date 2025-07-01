// Verificar token al cargar
function verificarTokenAlCargar() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
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
        toggleIcon.src = '/img/abierto.png';
    } else {
        passwordInput.type = 'password';
        toggleIcon.src = '/img/cerrado.png';
    }
}

// Cargar bodegas desde la API
async function cargarBodegas() {
    try {
        const response = await fetch('http://localhost:4000/bode/mostrar');
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
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
    }
}

// Cargar datos del usuario
async function cargarDatosUsuario() {
    const urlParams = new URLSearchParams(window.location.search);
    const nombreUsuario = urlParams.get('nombre');
    
    if (!nombreUsuario) {
        alert('No se proporcionó un nombre de usuario');
        window.location.href = '/usuario';
        return;
    }

    document.getElementById('nombre').value = nombreUsuario;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:4000/user/mostrar?nombre=${encodeURIComponent(nombreUsuario)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.body && data.body.length > 0) {
                const usuario = data.body[0];
                document.getElementById('bodega').value = usuario.id_bodega || '';
            }
        }
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
    }
}

// Modificar usuario
async function modificarUsuario() {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const nombreUsuario = urlParams.get('nombre');

    if (!token || !nombreUsuario) {
        alert('No hay sesión activa o nombre no encontrado');
        window.location.href = '/';
        return;
    }

    const btnGuardar = document.getElementById('guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const usuarioData = {
            id_bodega: parseInt(document.getElementById('bodega').value),
            nombre: nombreUsuario,
            contrasena: document.getElementById('contrasena').value
        };

        // Validación básica
        if (!usuarioData.id_bodega) throw new Error('Seleccione una bodega válida');
        if (usuarioData.contrasena && usuarioData.contrasena.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const response = await fetch('http://localhost:4000/user/modificar', {
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

        alert('Usuario modificado correctamente');
        window.location.href = '/usuario';
    } catch (error) {
        console.error('Error al modificar usuario:', error);
        alert(`Error: ${error.message}`);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarBodegas();
    cargarDatosUsuario();
    document.getElementById('guardar').addEventListener('click', modificarUsuario);
});