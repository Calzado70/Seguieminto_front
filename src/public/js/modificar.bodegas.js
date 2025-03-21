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

async function modificarBodega() {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const idBodega = urlParams.get('id'); // Obtener el ID desde la URL

    // Verificar si el ID de la bodega está presente
    if (!idBodega) {
        alert('ID de bodega no encontrado');
        window.location.href = '/crear_bodega'; // Redirigir a la vista crear_bodega
        return;
    }

    if (!token) {
        alert('No hay sesión activa');
        window.location.href = '/';
        return;
    }

    const bodegaData = {
        id_bodega: idBodega, // Incluir el ID en los datos
        nombre: document.getElementById('nombre').value,
        capacidad: document.getElementById('capacidad').value
    };

    console.log('Datos enviados al backend:', bodegaData); // Para depuración

    try {
        const response = await fetch('http://localhost:4000/bode/bodega', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodegaData)
        });

        const data = await response.json();
        console.log('Respuesta del backend:', data);

        if (response.ok) {
            alert('Bodega modificada correctamente');
            window.location.href = '/crear_bodega';
        } else {
            alert(`Error: ${data.message || 'No se pudo modificar la bodega'}`);
        }
    } catch (error) {
        console.error('Error al modificar bodega:', error);
        alert('Error al modificar la bodega');
    }
}

function cargaridbodega() {
    const urlParams = new URLSearchParams(window.location.search);
    const idBodega = urlParams.get('id');
    if (idBodega) {
        document.getElementById('idBodega').value = idBodega;
    } else {
        alert('No se proporcionó un idBodega de usuario');
        window.location.href = '/crear_bodega';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    redirigir('adminUsuario');
    redirigir('bodegas');
    redirigir('historial');
    document.getElementById('guardar').addEventListener('click', modificarBodega);
});