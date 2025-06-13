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

// Redirigir según los select
function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
    selectElement.addEventListener('change', function() {
        const selectedOption = selectElement.options[selectElement.selectedIndex].value;
        if (selectedOption) {
            window.location.href = selectedOption;
        }
    });
}

// Guardar cambios
async function modificarUsuario() {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const nombreUsuario = urlParams.get('nombre');

    if (!token || !nombreUsuario) {
        alert('No hay sesión activa o nombre no encontrado');
        window.location.href = '/';
        return;
    }

    const usuarioData = {
        nombre: nombreUsuario,
        contrasena: '', // No hay campo en la vista
        descripcion: document.getElementById('descripcion').value,
        bodega: document.getElementById('bodega').value
        // No incluimos 'rol' aquí
    };

    console.log('Datos enviados al backend:', usuarioData); // Para depuración

    try {
        const response = await fetch('http://localhost:4000/user/usuario', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(usuarioData)
        });

        const data = await response.json();
        console.log('Respuesta del backend:', data);

        if (response.ok) {
            alert('Usuario modificado correctamente');
            window.location.href = '/usuario';
        } else {
            alert(`Error: ${data.message || 'No se pudo modificar el usuario'}`);
        }
    } catch (error) {
        console.error('Error al modificar usuario:', error);
        alert('Error al modificar el usuario');
    }
}

// Cargar el nombre al iniciar
function cargarNombreUsuario() {
    const urlParams = new URLSearchParams(window.location.search);
    const nombreUsuario = urlParams.get('nombre');
    if (nombreUsuario) {
        document.getElementById('nombre').value = nombreUsuario;
    } else {
        alert('No se proporcionó un nombre de usuario');
        window.location.href = '/usuario';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarNombreUsuario();
    document.getElementById('guardar').addEventListener('click', modificarUsuario);
});