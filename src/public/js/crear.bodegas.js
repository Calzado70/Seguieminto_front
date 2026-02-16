// Variables globales
let currentPage = 1;
const recordsPerPage = 5;
let allBodegas = [];

// Cargar información al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    verificarTokenAlCargar();
    await cargarBodegas();
    setupEventListeners();
    
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
});

function setupEventListeners() {
    // Botón de agregar
    document.getElementById('agregarBodega').addEventListener('click', crearBodega);
    
    // Búsqueda
    document.getElementById('bodegaSearch').addEventListener('input', filterBodegas);
    
    // Paginación
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(allBodegas.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayCurrentPage();
        }
    });
    
    // Redirecciones
    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');
}

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

async function crearBodega() {
    const btnAgregar = document.getElementById('agregarBodega');
    const originalText = btnAgregar.innerHTML;
    
    // Mostrar estado de carga
    btnAgregar.disabled = true;
    btnAgregar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No hay sesión activa. Por favor, inicia sesión.');
        }

        // Obtener valores
        const nombre = document.getElementById('nombreBodega').value.trim();
        const capacidad = parseFloat(document.getElementById('capacidadBodega').value);

        // Validaciones
        if (!nombre || nombre.length < 3) {
            throw new Error('El nombre debe tener al menos 3 caracteres');
        }

        if (isNaN(capacidad)) {
            throw new Error('La capacidad debe ser un número');
        }

        if (capacidad <= 0) {
            throw new Error('La capacidad debe ser mayor a 0');
        }

        const bodegaData = {
            nombre,
            capacidad,
            estado: 'ACTIVA'
        };

        // Mostrar notificación de carga
        showToast('Creando bodega...', 'info');

        const response = await fetch('http://192.168.1.13:4000/bode/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodegaData)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Error al crear bodega');
        }

        // Éxito - mostrar feedback y limpiar formulario
        showToast('Bodega creada exitosamente!', 'success');
        
        // Limpiar formulario
        document.getElementById('nombreBodega').value = '';
        document.getElementById('capacidadBodega').value = '';
        
        // Recargar lista de bodegas
        await cargarBodegas();
        
    } catch (error) {
        console.error('Error al crear bodega:', error);
        
        // Mostrar error al usuario
        showToast(error.message, 'error');
        
        // Resaltar campos con error
        if (error.message.includes('nombre')) {
            document.getElementById('nombreBodega').focus();
        } else if (error.message.includes('capacidad')) {
            document.getElementById('capacidadBodega').focus();
        }
    } finally {
        // Restaurar estado normal del botón
        btnAgregar.disabled = false;
        btnAgregar.innerHTML = originalText;
    }
}

async function cargarBodegas() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('http://192.168.1.13:4000/bode/mostrar', {
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

        const result = await response.json();
        
        // Validación mejorada de la respuesta
        if (!result.success || !Array.isArray(result.data)) {
            console.error('Formato de respuesta inesperado:', result);
            throw new Error('Formato de datos incorrecto del servidor');
        }

        allBodegas = result.data;
        displayCurrentPage();
        
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
        showToast(`Error al cargar bodegas: ${error.message}`, 'error');
    }
}

function filterBodegas() {
    const searchTerm = document.getElementById('bodegaSearch').value.toLowerCase();
    if (!searchTerm) {
        displayCurrentPage();
        return;
    }
    
    const filteredBodegas = allBodegas.filter(bodega => 
        bodega.nombre.toLowerCase().includes(searchTerm) ||
        bodega.capacidad.toString().includes(searchTerm) ||
        (bodega.estado && bodega.estado.toLowerCase().includes(searchTerm))
    );
    
    actualizarTablaBodegas(filteredBodegas);
}

function displayCurrentPage() {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const bodegasToDisplay = allBodegas.slice(startIndex, endIndex);
    
    actualizarTablaBodegas(bodegasToDisplay);
    updatePageInfo();
    updatePaginationControls();
}

function updatePageInfo() {
    const totalPages = Math.ceil(allBodegas.length / recordsPerPage);
    const startItem = (currentPage - 1) * recordsPerPage + 1;
    const endItem = Math.min(currentPage * recordsPerPage, allBodegas.length);
    
    document.getElementById('page-info').textContent = 
        `Mostrando ${startItem}-${endItem} de ${allBodegas.length} bodegas`;
}

function updatePaginationControls() {
    const totalPages = Math.ceil(allBodegas.length / recordsPerPage);
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages || totalPages === 0;
    
    // Actualizar números de página
    const pageNumbersContainer = document.getElementById('page-numbers');
    pageNumbersContainer.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const pageNumber = document.createElement('div');
        pageNumber.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageNumber.textContent = i;
        pageNumber.addEventListener('click', () => {
            currentPage = i;
            displayCurrentPage();
        });
        pageNumbersContainer.appendChild(pageNumber);
    }
}

function actualizarTablaBodegas(bodegas) {
    const tbody = document.getElementById('bodegasTableBody');
    tbody.innerHTML = '';

    if (!bodegas || !Array.isArray(bodegas)) {
        console.error('Bodegas no es un array válido:', bodegas);
        return;
    }

    bodegas.forEach(bodega => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${bodega.nombre || 'N/A'}</td>
            <td>${bodega.capacidad || 'N/A'}</td> <!-- Cambiado: eliminado "m²" -->
            <td>
                <span class="status-badge ${bodega.estado === 'ACTIVA' ? 'status-active' : 'status-inactive'}">
                    ${bodega.estado || 'N/A'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" data-id="${bodega.id_bodega}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-id="${bodega.id_bodega}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });

    // Asignar eventos a los botones
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', eliminarBodega);
    });
    
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idBodega = e.currentTarget.getAttribute('data-id');
            window.location.href = `/modi_bodegas?id=${encodeURIComponent(idBodega)}`;
        });
    });
}

async function eliminarBodega(event) {
    const idBodega = event.currentTarget.getAttribute('data-id');
    const token = localStorage.getItem('token');

    if (!token) {
        showToast('No hay sesión activa. Por favor, inicia sesión.', 'error');
        window.location.href = '/';
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar esta bodega?`)) {
        return;
    }

    try {
        const response = await fetch('http://192.168.1.13:4000/bode/eliminar', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_bodega: idBodega })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Bodega eliminada correctamente', 'success');
            await cargarBodegas();
        } else {
            throw new Error(data.message || 'No se pudo eliminar la bodega');
        }
    } catch (error) {
        console.error('Error al eliminar bodega:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

function irAVistaAlertas() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('No hay sesión activa. Por favor, inicia sesión.', 'error');
        window.location.href = '/';
        return;
    }
    window.location.href = '/alerta';
}

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