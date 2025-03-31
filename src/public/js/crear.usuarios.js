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

function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
    selectElement.addEventListener('change', function() {
        const selectedOption = selectElement.options[selectElement.selectedIndex].value;
        if (selectedOption) {
            window.location.href = selectedOption;
        }
    });
}

async function crearUsuario() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    const usuarioData = {
        nombre: document.querySelector('input[placeholder="Nombre de usuario"]').value,
        contrasena: document.querySelector('input[placeholder="ingrese la contraseña"]').value,
        descripcion: document.querySelector('input[placeholder="Descripción"]').value,
        bodega: document.querySelector('.desple:nth-of-type(1)').value,
        rol: document.querySelector('.desple:nth-of-type(2)').value
    };

    try {
        const response = await fetch('http://localhost:4000/user/usuario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(usuarioData)
        });

        const responseData = await response.json();
        if (response.ok) {
            alert('Usuario creado correctamente');
            document.querySelectorAll('.input').forEach(input => input.value = '');
            document.querySelectorAll('.desple').forEach(select => select.selectedIndex = 0);
            await cargarUsuarios(); // Refresh user list after creation
        } else {
            alert(`Error: ${responseData.message}`);
        }
    } catch (error) {
        console.error('Error al crear usuario:', error);
        alert('Error al crear el usuario');
    }
}

async function cargarUsuarios() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('http://localhost:4000/user/usuario', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error del servidor: ${response.status} - ${errorData.message}`);
        }

        const data = await response.json();
        console.log('Respuesta completa del backend:', data);

        const usuarios = data.body;
        if (!usuarios || !Array.isArray(usuarios)) {
            throw new Error('Los datos de usuarios no están en el formato esperado');
        }

        actualizarTablaUsuarios(usuarios);
    } catch (error) {
        console.error('Error al cargar usuarios:', error.message);
        alert('No se pudieron cargar los usuarios. Verifica el servidor.');
    }
}

function actualizarTablaUsuarios(usuarios) {
    const tbody = document.querySelector('.cont-segun-formu');
    const existingRows = tbody.querySelectorAll('.table-row2');
    existingRows.forEach(row => row.remove());

    if (!usuarios || !Array.isArray(usuarios)) {
        console.error('Usuarios no es un array válido:', usuarios);
        return;
    }

    usuarios.forEach(usuario => {
        const row = document.createElement('div');
        row.className = 'table-row2';
        row.dataset.nombre = usuario.nombre;
        row.innerHTML = `
            <span>${usuario.nombre || 'N/A'}</span>
            <span>${usuario.rol || 'N/A'}</span>
            <span>${usuario.bodega || 'N/A'}</span>
            <span class="table-row2-bot" type="button">
                <img src="/img/editar.png" alt="Editar" class="editar" data-nombre="${usuario.nombre}">
                <img src="/img/borrar.png" alt="Borrar" class="borrar" data-id="${usuario.id_usuario}">
            </span>
        `;
        tbody.appendChild(row);
    });

    // Evento para eliminar
    document.querySelectorAll('.borrar').forEach(button => {
        button.addEventListener('click', eliminarUsuario);
    });

    // Evento para editar (redirección con nombre)
    document.querySelectorAll('.editar').forEach(button => {
        button.addEventListener('click', (event) => {
            const nombreUsuario = event.target.getAttribute('data-nombre');
            window.location.href = `/modificar?nombre=${encodeURIComponent(nombreUsuario)}`; // Usar nombre en la URL
        });
    });
}

async function eliminarUsuario(event) {
    const idUsuario = event.target.getAttribute('data-id');
    const token = localStorage.getItem('token');

    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario con ID ${idUsuario}?`)) {
        return; // Cancelar si el usuario no confirma
    }

    try {
        const response = await fetch('http://localhost:4000/user/usuario', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_usuario: idUsuario })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Usuario eliminado correctamente');
            await cargarUsuarios(); // Recargar la lista de usuarios
        } else {
            alert(`Error: ${data.message || 'No se pudo eliminar el usuario'}`);
        }
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        alert('Error al eliminar el usuario. Verifica el servidor.');
    }
}


function irAVistaAlertas() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }
    window.location.href = '/alerta';
}

function togglePassword() {
    const passwordInput = document.getElementById('contrasena');
    const toggleIcon = document.getElementById('toggle-icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.src = 'img/abierto.png';
    } else {
        passwordInput.type = 'password';
        toggleIcon.src = 'img/cerrado.png';
    }
}

// Event listeners
redirigir('adminUsuario');
redirigir('bodegas');
redirigir('historial');

// Luego usa esta función en el event listener:
document.querySelector('.bell').addEventListener('click', irAVistaAlertas);


document.querySelector('.button').addEventListener('click', crearUsuario);

// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarUsuarios();
});