// ===============================
// VARIABLES GLOBALES
// ===============================
let usuarioActual = {};

// ===============================
// VERIFICAR TOKEN
// ===============================// ===============================
// OBTENER DATOS DESDE URL
// ===============================
function cargarDatosUsuario() {
    const params = new URLSearchParams(window.location.search);

    const id = params.get('id');
    const nombre = params.get('nombre');

    if (!id) {
        showToast('ID de usuario no encontrado', 'error');
        window.location.href = '/usuario';
        return;
    }

    usuarioActual.id_usuario = id;

    document.getElementById('nombre').value = nombre || '';
}

// ===============================
// CARGAR BODEGAS
// ===============================
async function cargarBodegas() {
    try {
        const token = localStorage.getItem('token');

    const data = await apiFetch('/bode/mostrar');
    
    const select = document.getElementById('bodega');
        select.innerHTML = '<option value="">Seleccione bodega</option>';

        if (data.success && Array.isArray(data.data)) {
            data.data.forEach(b => {
                const option = document.createElement('option');
                option.value = b.id_bodega;
                option.textContent = b.nombre;
                select.appendChild(option);
            });
        }

    } catch (err) {
        console.error(err);
        showToast('Error cargando bodegas', 'error');
    }
}

// ===============================
// MODIFICAR USUARIO
// ===============================
async function modificarUsuario() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('guardar');

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Guardando...';

    try {
        const usuarioData = {
            id_usuario: usuarioActual.id_usuario,
            id_bodega: parseInt(document.getElementById('bodega').value),
            nombre: document.getElementById('nombre').value,
            contrasena: document.getElementById('contrasena').value
        };

        if (!usuarioData.id_bodega) throw new Error('Seleccione una bodega');

        await apiFetch('/user/modificar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usuarioData)
        });

        showToast('Usuario actualizado', 'success');

        setTimeout(() => {
            window.location.href = '/usuario';
        }, 1200);

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

// ===============================
// UTILIDADES
// ===============================

function togglePassword() {
    const input = document.getElementById('contrasena');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function cancelarEdicion() {
    window.location.href = '/usuario';
}

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
    cargarDatosUsuario();
    cargarBodegas();

    document.getElementById('guardar').addEventListener('click', modificarUsuario);
    document.getElementById('cancelar').addEventListener('click', cancelarEdicion);

    ['adminUsuario', 'bodegas', 'historial', 'productos'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', function () {
                if (this.value) window.location.href = this.value;
            });
        }
    });
});