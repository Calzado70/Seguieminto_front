let currentPage = 1;
const recordsPerPage = 5;
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Asignar evento al botón correctamente
    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', crearUsuario);
    } else {
        console.error('No se encontró el botón con ID btnGuardar');
    }

    await cargarBodegas();
});




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
    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Creando...';

    try {
        const usuarioData = {
            id_bodega: parseInt(document.getElementById('bodega').value),
            nombre: document.getElementById('nombreUsuario').value.trim(),
            correo: document.getElementById('correo').value.trim(),
            contrasena: document.getElementById('contrasena').value,
            rol: document.getElementById('rol').value,
            estado: document.getElementById('estado').value
        };

        // Validación frontend
        if (!usuarioData.id_bodega || !usuarioData.nombre || !usuarioData.correo || 
            !usuarioData.contrasena || !usuarioData.rol) {
            throw new Error('Todos los campos son obligatorios');
        }

        if (!usuarioData.correo.includes('@')) {
            throw new Error('Ingrese un correo válido');
        }

        const token = localStorage.getItem('token');
        if (!token) throw new Error('Debe iniciar sesión primero');

        const response = await fetch('http://localhost:4000/user/insertarusuario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(usuarioData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al crear usuario');
        }

        alert('Usuario creado exitosamente!');
        // Limpiar formulario
        document.querySelectorAll('input').forEach(i => i.value = '');
        document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
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

        allUsers = data.body || [];
        if (!Array.isArray(allUsers)) {
            throw new Error('Los datos de usuarios no están en el formato esperado');
        }

        updatePaginationControls();
        displayCurrentPage();
    } catch (error) {
        console.error('Error al cargar usuarios:', error.message);
        alert('No se pudieron cargar los usuarios. Verifica el servidor.');
    }
}

// Función para mostrar los usuarios de la página actual
function displayCurrentPage() {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const usersToDisplay = allUsers.slice(startIndex, endIndex);
    
    actualizarTablaUsuarios(usersToDisplay);
    updatePageInfo();
    updatePaginationControls();
}

// Función para actualizar la información de la página
function updatePageInfo() {
    const totalPages = Math.ceil(allUsers.length / recordsPerPage);
    document.getElementById('page-info').textContent = `Página ${currentPage} de ${totalPages}`;
}

// Función para actualizar los controles de paginación
function updatePaginationControls() {
    const totalPages = Math.ceil(allUsers.length / recordsPerPage);
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages || totalPages === 0;
    
    console.log(`Estado actual: Página ${currentPage} de ${totalPages}`);
    console.log(`Anterior deshabilitado: ${prevButton.disabled}`);
    console.log(`Siguiente deshabilitado: ${nextButton.disabled}`);
}

// Event listeners para los botones de paginación
document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayCurrentPage();
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(allUsers.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayCurrentPage();
    }
});

// Modifica la función actualizarTablaUsuarios para que no elimine los encabezados
function actualizarTablaUsuarios(usuarios) {
    const tbody = document.querySelector('.cont-segun-formu');
    const existingDataRows = tbody.querySelectorAll('.table-row2');
    existingDataRows.forEach(row => row.remove());

    if (!usuarios || !Array.isArray(usuarios)) {
        console.error('Usuarios no es un array válido:', usuarios);
        return;
    }

    // Resto de la función permanece igual...
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

    // Eventos para eliminar y editar (mantén estos como están)
    document.querySelectorAll('.borrar').forEach(button => {
        button.addEventListener('click', eliminarUsuario);
    });

    document.querySelectorAll('.editar').forEach(button => {
        button.addEventListener('click', (event) => {
            const nombreUsuario = event.target.getAttribute('data-nombre');
            window.location.href = `/modificar?nombre=${encodeURIComponent(nombreUsuario)}`;
        });
    });
}

// Modifica la función eliminarUsuario para resetear la paginación después de eliminar
async function eliminarUsuario(event) {
    const idUsuario = event.target.getAttribute('data-id');
    const token = localStorage.getItem('token');

    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario con ID ${idUsuario}?`)) {
        return;
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
            // Resetear a la primera página después de eliminar
            currentPage = 1;
            await cargarUsuarios();
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

async function cargarBodegas() {
    const selectBodega = document.getElementById('bodega');
    
    try {
        const response = await fetch('http://localhost:4000/bode/mostrar');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Limpiar select
        selectBodega.innerHTML = '<option value="">Bodega</option>';
        
        // Verificar estructura de respuesta
        if (result.success && Array.isArray(result.data)) {
            result.data.forEach(bodega => {
                const option = document.createElement('option');
                // Ajusta según los campos reales que devuelve tu procedimiento
                option.value = bodega.id_bodega || bodega.ID_BODEGA;
                option.textContent = bodega.nombre || bodega.NOMBRE;
                selectBodega.appendChild(option);
            });
        } else {
            console.error('Estructura de respuesta inesperada:', result);
            selectBodega.innerHTML = '<option value="">Error cargando bodegas</option>';
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
        selectBodega.innerHTML = '<option value="">Error al cargar bodegas</option>';
    }
}

// Event listeners
redirigir('adminUsuario');
redirigir('bodegas');
redirigir('historial');


document.addEventListener('DOMContentLoaded', cargarBodegas);
document.querySelector('.button').addEventListener('click', crearUsuario);

// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarUsuarios();
});