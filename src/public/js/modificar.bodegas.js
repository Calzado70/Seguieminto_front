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
    if (selectElement) {
        selectElement.addEventListener('change', function() {
            const selectedOption = selectElement.options[selectElement.selectedIndex].value;
            if (selectedOption) {
                window.location.href = selectedOption;
            }
        });
    }
}

async function cargarDatosBodega() {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const idBodega = urlParams.get('id');

    if (!idBodega) {
        alert('No se especificó bodega a modificar');
        window.location.href = '/crear_bodega';
        return;
    }

    try {
        const response = await fetch(`http://localhost:4000/bode/mostrar?id=${idBodega}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error al obtener datos de la bodega');
        }

        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error('Bodega no encontrada');
        }

        const bodega = result.data[0];
        document.getElementById('idBodega').value = bodega.id_bodega;
        document.getElementById('nombre').value = bodega.nombre || '';
        document.getElementById('capacidad').value = bodega.capacidad || '';
        document.getElementById('estado').value = bodega.estado || 'ACTIVA';

    } catch (error) {
        console.error('Error al cargar bodega:', error);
        alert(`Error: ${error.message}`);
        window.location.href = '/crear_bodega';
    }
}

async function modificarBodega() {
    const btnGuardar = document.getElementById('guardar');
    const originalText = btnGuardar.textContent;
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No hay sesión activa');

        const idBodega = document.getElementById('idBodega').value;
        const nombre = document.getElementById('nombre').value.trim();
        const capacidad = parseInt(document.getElementById('capacidad').value);
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

        const response = await fetch('http://localhost:4000/bode/modificar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodegaData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al modificar bodega');
        }

        alert('Bodega modificada correctamente');
        window.location.href = '/crear_bodega';

    } catch (error) {
        console.error('Error en modificarBodega:', error);
        alert(`Error: ${error.message}`);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = originalText;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarDatosBodega(); // ¡Asegúrate de llamar esta función!
    document.getElementById('guardar').addEventListener('click', modificarBodega);
});