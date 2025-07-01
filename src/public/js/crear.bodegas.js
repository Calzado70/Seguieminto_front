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
    const originalText = btnAgregar.textContent;
    btnAgregar.disabled = true;
    btnAgregar.textContent = 'Creando...';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No hay sesión activa. Por favor, inicia sesión.');
        }

        // Obtener valores
        const nombre = document.querySelector('input[placeholder="Nombre de Bodega"]').value.trim();
        const capacidad = parseFloat(document.querySelector('input[placeholder="Capacidad de Bodega"]').value);

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
            estado: 'ACTIVA' // Coincide con el ENUM del procedimiento
        };

        const response = await fetch('http://localhost:4000/bode/crear', {
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

        alert('Bodega creada correctamente');
        document.querySelectorAll('.input').forEach(input => input.value = '');
        await cargarBodegas();
        
    } catch (error) {
        console.error('Error al crear bodega:', error);
        alert(`Error: ${error.message}`);
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = originalText;
    }
}


async function cargarBodegas() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('http://localhost:4000/bode/mostrar', {
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

        actualizarTablaBodegas(result.data);
        
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
        alert(`Error al cargar bodegas: ${error.message}`);
    }
}

function actualizarTablaBodegas(bodegas) {
    const tbody = document.querySelector('.cont-segun-formu');
    const existingRows = tbody.querySelectorAll('.table-row2');
    existingRows.forEach(row => row.remove());

    if (!bodegas || !Array.isArray(bodegas)) {
        console.error('Bodegas no es un array válido:', bodegas);
        return;
    }

    bodegas.forEach(bodega => {
        const row = document.createElement('div');
        row.className = 'table-row2';
        row.dataset.id = bodega.id_bodega; // Usar el ID en lugar del nombre
        row.innerHTML = `
            <span>${bodega.nombre || 'N/A'}</span>
            <span>${bodega.capacidad || 'N/A'}</span>
            <span class="table-row2-bot" type="button">
                <img src="/img/editar.png" alt="Editar" class="editar" data-id="${bodega.id_bodega}"> <!-- Usar data-id -->
                <img src="/img/borrar.png" alt="Borrar" class="borrar" data-id="${bodega.id_bodega}">
            </span> 
        `;
        tbody.appendChild(row);
    });

    // Evento para eliminar
    document.querySelectorAll('.borrar').forEach(button => {
        button.addEventListener('click', eliminarBodega);
    });

    // Evento para editar (redirección con ID)
    document.querySelectorAll('.editar').forEach(button => {
        button.addEventListener('click', (event) => {
            const idBodega = event.target.getAttribute('data-id'); // Obtener el ID
            window.location.href = `/modi_bodegas?id=${encodeURIComponent(idBodega)}`; // Usar ID en la URL
        });
    });
}

async function eliminarBodega(event) {
    const idBodega = event.target.getAttribute('data-id');
    const token = localStorage.getItem('token');

    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar la bodega con ID ${idBodega}?`)) {
        return; 
    }

    try {
        const response = await fetch('http://localhost:4000/bode/eliminar', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_bodega: idBodega })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Bodega eliminada correctamente');
            await cargarBodegas();
        } else {
            alert(`Error: ${data.message || 'No se pudo eliminar la bodega'}`);
        }
    } catch (error) {
        console.error('Error al eliminar bodega:', error);
        alert('Error al eliminar la bodega. Verifica el servidor.');
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

// Event listeners
redirigir('adminUsuario');
redirigir('bodegas');
redirigir('historial');

// Luego usa esta función en el event listener:


document.addEventListener('DOMContentLoaded', () => {
    // Vincular correctamente el evento al botón
    document.getElementById('agregarBodega').addEventListener('click', crearBodega);
    cargarBodegas();
});



document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
});