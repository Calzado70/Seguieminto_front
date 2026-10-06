document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    const mensaje = document.getElementById('mensaje');

    try {
        const data = await apiFetch('/user/loginusuario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre: usuario, contrasena: contrasena }),
        });

        if (data) {
            // Guardar el token y la información del usuario en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('rol', data.usuario.rol);
            localStorage.setItem('bodega', data.usuario.id_bodega);
            localStorage.setItem('nombre_bodega', data.usuario.nombre_bodega);
            localStorage.setItem('nombre', data.usuario.nombre);
            localStorage.setItem('id_usuario', data.usuario.id_usuario);

            // Cookie de transporte para que el servidor del frontend pueda
            // reenviar el token al backend y validar la ruta (Fase 3.3).
            // No reemplaza localStorage: el resto del JS sigue leyéndolo allí.
            document.cookie = `token=${encodeURIComponent(data.token)}; path=/; SameSite=Lax`;

            // Mostrar mensaje de éxito
            mensaje.textContent = 'Ingreso Exitoso';
            mensaje.classList.remove('error');
            mensaje.classList.add('success', 'visible');

            // Redirección inmediata según el rol
            const rol = data.usuario.rol;

            switch (rol) {
                case 'OPERARIO':
                    window.location.href = '/sesion';
                    break;
                case 'ADMINISTRADOR':
                    window.location.href = '/usuario';
                    break;
                case 'SUPERVISOR':
                    window.location.href = '/sesion';
                    break;
                case 'LOGISTICA':
                    window.location.href = '/logistica';
                    break;
                default:
                    window.location.href = '/';
            }
        }
    } catch (error) {
        // apiFetch lanza con el mensaje del backend (401 = credenciales
        // incorrectas, 429 = rate limit). Se muestra tal cual para no
        // perder el detalle que antes se perdia en el catch generico.
        console.error('Error al iniciar sesión:', error);

        mensaje.textContent = error.message || 'Error al iniciar sesión, por favor intente de nuevo.';
        mensaje.classList.remove('success');
        mensaje.classList.add('error', 'visible');
    }
});

function togglePassword() {
    const passwordInput = document.getElementById('contrasena');
    const toggleIcon = document.getElementById('toggle-icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.src = '/img/abierto.png';
    } else {
        passwordInput.type = 'password';
        toggleIcon.src = '/img/cerrado.png';
    }
}