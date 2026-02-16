let currentPage = 1;
const recordsPerPage = 5;
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar información del usuario actual
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            document.getElementById('currentUserName').textContent = payload.nombre || 'Usuario';
            document.getElementById('currentUserRole').textContent = payload.rol || 'Rol';
        } catch (error) {
            console.error('Error al parsear token:', error);
        }
    }

    // Asignar eventos
    document.getElementById('btnGuardar').addEventListener('click', crearUsuario);
    document.getElementById('userSearch').addEventListener('input', filterUsers);
    
    // Cargar datos iniciales
    await Promise.all([cargarBodegas(), cargarUsuarios()]);
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
    const originalText = btnGuardar.innerHTML;
    
    // Mostrar estado de carga
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    
    try {
        // Obtener valores del formulario
        const usuarioData = {
            id_bodega: parseInt(document.getElementById('bodega').value),
            nombre: document.getElementById('nombreUsuario').value.trim(),
            correo: document.getElementById('correo').value.trim(),
            contrasena: document.getElementById('contrasena').value,
            rol: document.getElementById('rol').value,
            estado: document.getElementById('estado').value || 'ACTIVO'
        };

        // Validaciones mejoradas
        if (!usuarioData.id_bodega || isNaN(usuarioData.id_bodega)) {
            throw new Error('Seleccione una bodega válida');
        }
        
        if (!usuarioData.nombre || usuarioData.nombre.length < 3) {
            throw new Error('El nombre debe tener al menos 3 caracteres');
        }
        
        if (!usuarioData.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuarioData.correo)) {
            throw new Error('Ingrese un correo electrónico válido');
        }
        
        if (!usuarioData.contrasena || usuarioData.contrasena.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        if (!usuarioData.rol) {
            throw new Error('Seleccione un rol válido');
        }

        // Verificar token
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente');
        }

        // Mostrar carga mientras se hace la petición
        showToast('Creando usuario...', 'info');

        // Enviar la solicitud al servidor
        const response = await fetch('http://192.168.1.13:4000/user/insertarusuario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(usuarioData)
        });

        const data = await response.json();

        // Manejar respuesta del servidor
        if (!response.ok || !data.success) {
            const errorMsg = data.message || data.error || 'Error al crear usuario';
            throw new Error(errorMsg);
        }

        // Éxito - mostrar feedback y limpiar formulario
        showToast('Usuario creado exitosamente!', 'success');
        
        // Limpiar formulario
        document.getElementById('nombreUsuario').value = '';
        document.getElementById('correo').value = '';
        document.getElementById('contrasena').value = '';
        document.getElementById('bodega').selectedIndex = 0;
        document.getElementById('rol').selectedIndex = 0;
        
        // Recargar lista de usuarios
        await cargarUsuarios();
        
    } catch (error) {
        console.error('Error en crearUsuario:', error);
        
        // Mostrar error al usuario
        showToast(error.message, 'error');
        
        // Resaltar campos con error (opcional)
        if (error.message.includes('nombre')) {
            document.getElementById('nombreUsuario').focus();
        } else if (error.message.includes('correo')) {
            document.getElementById('correo').focus();
        } else if (error.message.includes('contraseña')) {
            document.getElementById('contrasena').focus();
        } else if (error.message.includes('bodega')) {
            document.getElementById('bodega').focus();
        } else if (error.message.includes('rol')) {
            document.getElementById('rol').focus();
        }
    } finally {
        // Restaurar estado normal del botón
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = originalText;
    }
}


async function cargarUsuarios() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('http://192.168.1.13:4000/user/mostrar', {
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
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    if (!usuarios || !Array.isArray(usuarios)) {
        console.error('Usuarios no es un array válido:', usuarios);
        return;
    }

    usuarios.forEach(usuario => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${usuario.nombre || 'N/A'}</td>
            <td>${usuario.rol || 'N/A'}</td>
            <td>${usuario.nombre_bodega || 'N/A'}</td>
            <td>
                <span class="status-badge ${usuario.estado === 'ACTIVO' ? 'status-active' : 'status-inactive'}">
                    ${usuario.estado || 'N/A'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" data-id="${usuario.id_usuario}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-id="${usuario.id_usuario}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });

    // Asignar eventos a los botones
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', eliminarUsuario);
    });
    
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idUsuario = e.currentTarget.getAttribute('data-id');
            const nombreUsuario = e.currentTarget.closest('tr').querySelector('td:first-child').textContent;
            window.location.href = `/modificar?id=${idUsuario}&nombre=${encodeURIComponent(nombreUsuario)}`;
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
        const response = await fetch('http://192.168.1.13:4000/user/eliminar', {
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
        const response = await fetch('http://192.168.1.13:4000/bode/mostrar');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Verificación de estructura mejorada
        if (result.success && Array.isArray(result.data)) {
            selectBodega.innerHTML = '<option value="">Seleccione bodega</option>';
            
            result.data.forEach(bodega => {
                const option = document.createElement('option');
                option.value = bodega.id_bodega;
                option.textContent = bodega.nombre;
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

// Función para filtrar usuarios
function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    if (!searchTerm) {
        displayCurrentPage();
        return;
    }
    
    const filteredUsers = allUsers.filter(user => 
        user.nombre.toLowerCase().includes(searchTerm) ||
        user.rol.toLowerCase().includes(searchTerm) ||
        (user.nombre_bodega && user.nombre_bodega.toLowerCase().includes(searchTerm))
    );
    
    actualizarTablaUsuarios(filteredUsers);
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

// Event listeners
redirigir('adminUsuario');
redirigir('bodegas');
redirigir('historial');


document.addEventListener('DOMContentLoaded', cargarBodegas);

// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarUsuarios();
});