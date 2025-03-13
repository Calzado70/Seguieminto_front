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
    const token = localStorage.getItem('token');
    if (!token) {
        alert('No hay sesión activa. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    const bodegaData = {
        nombre: document.querySelector('input[placeholder="Nombre de Bodega"]').value,
        capacidad: document.querySelector('input[placeholder="Capacidad de Bodega"]').value
    };

    try {
        const response = await fetch('http://localhost:4000/bode/bodega', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodegaData)
        });

        const responseData = await response.json();
        if (response.ok) {
            alert('Bodega creada correctamente');
            document.querySelectorAll('.input').forEach(input => input.value = '');
            await cargarBodegas(); // Refresh bodega list after creation
        } else {
            alert(`Error: ${responseData.message}`);
        }
    } catch (error) {
        console.error('Error al crear bodega:', error);
        alert('Error al crear la bodega');
    }
}

async function cargarBodegas() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('http://localhost:4000/bode/bodega', {
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

        const bodegas = data.body;
        if (!bodegas || !Array.isArray(bodegas)) {
            throw new Error('Los datos de bodegas no están en el formato esperado');
        }

        actualizarTablaBodegas(bodegas);
    } catch (error) {
        console.error('Error al cargar bodegas:', error.message);
        alert('No se pudieron cargar las bodegas. Verifica el servidor.');
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
        const response = await fetch('http://localhost:4000/bode/bodega', {
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
document.querySelector('.bell').addEventListener('click', irAVistaAlertas);


document.querySelector('.button').addEventListener('click', crearBodega);

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarBodegas();
});