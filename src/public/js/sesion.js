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

async function cargarBodegas() {
    const selectBodega = document.getElementById('id_bodega'); // corregido el ID

    try {
        const response = await fetch('http://localhost:4000/bode/mostrar');

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();

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



// // Event listeners
// redirigir('adminUsuario');
// redirigir('bodegas');
// redirigir('historial');


// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarBodegas();

    const formSesion = document.getElementById('formSesion');
    formSesion.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevenir comportamiento por defecto

        const id_bodega = document.getElementById('id_bodega').value;
        const id_usuario = document.getElementById('id_usuario').value;
        const observaciones = document.getElementById('observaciones').value;

        if (!id_bodega || !id_usuario) {
            alert('Todos los campos obligatorios deben estar completos.');
            return;
        }

        try {
            const response = await fetch('http://localhost:4000/product/inicio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    id_bodega: parseInt(id_bodega),
                    id_usuario: parseInt(id_usuario),
                    observaciones: observaciones.trim()
                })
            });

            const result = await response.json();
            console.log('Respuesta del servidor:', result);
            

            if (response.ok && result?.body?.id_sesion) {
  alert(result.body.mensaje || 'Sesión iniciada');
  localStorage.setItem('id_sesion', result.body.id_sesion);
  window.location.href = '/producto';
} else {
  const mensajeError = result?.mensaje || result?.message || result?.error || 'No se pudo iniciar la sesión.';
  alert(mensajeError);
}

        } catch (error) {
            console.error('Error al enviar datos:', error);
            alert('Hubo un error al iniciar la sesión.');
        }
    });
});