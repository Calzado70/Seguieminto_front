// ===============================
// VARIABLES GLOBALES
// ===============================
let usuarioActual = {};

// ===============================
// VERIFICAR TOKEN
// ===============================
function verificarTokenAlCargar() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        document.getElementById('currentUserName').textContent = payload.nombre || 'Usuario';
        document.getElementById('currentUserRole').textContent = payload.rol || 'Rol';

        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }

    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

// ===============================
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

        const res = await fetch('http://localhost:4000/bode/mostrar', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

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

        const res = await fetch('http://localhost:4000/user/modificar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(usuarioData)
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

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
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);

    setTimeout(() => t.classList.add('show'), 50);

    setTimeout(() => {
        t.remove();
    }, 3000);
}

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
});