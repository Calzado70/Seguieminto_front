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

        console.log("Respuesta completa del backend:", data); // Verifica la estructura de la respuesta

        if (response.ok) {
            // Guardar el token y la información del usuario en localStorage
            localStorage.setItem('token', data.token); // Guardar el token
            localStorage.setItem('rol', data.usuario.rol); // Guardar el rol del usuario
            localStorage.setItem('bodega', data.usuario.id_bodega); // Guardar el nombre de la bodega
            localStorage.setItem('nombre_bodega', data.usuario.nombre_bodega); // Guardar el nombre de la bodega
            localStorage.setItem('nombre', data.usuario.nombre); // Guardar el nombre del usuario

            console.log("Token guardado:", data.token); // Verifica que el token se esté guardando correctamente
            console.log("Rol del usuario:", data.usuario.rol); // Verifica el rol del usuario
            console.log("Bodega del usuario:", data.usuario.id_bodega); // Verifica la bodega del usuario
            console.log("Nombre de la bodega:", data.usuario.nombre_bodega); // Verifica el nombre de la bodega
            console.log("Nombre del usuario:", data.usuario.nombre); // Verifica el nombre del usuario
            

            let tiempoRestante = 3;
            mensaje.textContent = `Ingreso Exitoso en ${tiempoRestante} segundos...`;
            mensaje.classList.remove('error');
            mensaje.classList.add('success');

            const intervalo = setInterval(() => {
                tiempoRestante--;
                mensaje.textContent = `Ingreso Exitoso en ${tiempoRestante} segundos...`;

                if (tiempoRestante <= 0) {
                    clearInterval(intervalo);

                    const rol = data.usuario.rol;
                    console.log("Rol del usuario:", rol);

                    switch (rol) {
                        case 'Operario':
                            window.location.href = '/producto';
                            break;
                        case 'ADMINISTRADOR':
                            window.location.href = '/usuario';
                            break;
                        case 'Supervisor':
                            window.location.href = '/supervisor';
                            break;
                        case 'Operario de Inyeccion':
                            window.location.href = '/inyeccion';
                            break;
                        case 'Logistica':
                            window.location.href = '/logistica';
                            break;
                        default:
                            window.location.href = '/';
                    }
                }
            }, 1000);
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