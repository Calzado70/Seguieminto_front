document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    const mensaje = document.getElementById('mensaje');

    try {
        const response = await fetch(`http://localhost:4000/user/loginusuario`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre: usuario, contrasena: contrasena }),
        });

        const data = await response.json();

        console.log("Respuesta completa del backend:", data);

        if (response.ok) {
            // Guardar el token y la información del usuario en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('rol', data.usuario.rol);
            localStorage.setItem('bodega', data.usuario.id_bodega);
            localStorage.setItem('nombre_bodega', data.usuario.nombre_bodega);
            localStorage.setItem('nombre', data.usuario.nombre);
            localStorage.setItem('id_usuario', data.usuario.id_usuario);

            console.log("Token guardado:", data.token);
            console.log("Rol del usuario:", data.usuario.rol);
            console.log("Bodega del usuario:", data.usuario.id_bodega);
            console.log("Nombre de la bodega:", data.usuario.nombre_bodega);
            console.log("Nombre del usuario:", data.usuario.nombre);

            // Mostrar mensaje de éxito
            mensaje.textContent = 'Ingreso Exitoso';
            mensaje.classList.remove('error');
            mensaje.classList.add('success');

            // Redirección inmediata según el rol
            const rol = data.usuario.rol;
            console.log("Rol del usuario:", rol);

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
                case 'Logistica':
                    window.location.href = '/logistica';
                    break;
                default:
                    window.location.href = '/';
            }
        } else {
            mensaje.textContent = "Nombre o Contraseña Incorrectos, por favor intente de nuevo.";
            mensaje.classList.remove('success');
            mensaje.classList.add('error');
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        mensaje.textContent = 'Error al iniciar sesión, por favor intente de nuevo.';
        mensaje.classList.remove('success');
        mensaje.classList.add('error');
    }
});

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