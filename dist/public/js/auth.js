(function () {
    "use strict";

    var store = window.localStorage;
    var originalFetch = window.fetch;

    // ============================================================
    // Escape de HTML (Fase 3.6 — XSS)
    // Usar antes de interpolar cualquier dato de la BD/usuario
    // dentro de una plantilla asignada a innerHTML.
    // ============================================================
    window.escapeHtml = function (value) {
        if (value === null || value === undefined) return "";

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    // ============================================================
    // Cierre de sesión (Fase 3.3 + Fase 4.1c)
    // El token vive en localStorage y además se replica en una cookie de
    // transporte para que el servidor del frontend pueda validar la ruta.
    // Esta función limpia ambos; úsala en lugar de removeItem("token")
    // para no dejar la cookie huérfana.
    //
    // Antes se borraban 6 claves a mano, pero los módulos escriben 19
    // (listas de productos pendientes, sesiones, bodegas destino...).
    // Al cerrar sesión quedaban 12 claves de negocio del usuario anterior
    // en el navegador: en un PC compartido el siguiente usuario veía la
    // lista de productos del anterior. Se limpia el almacén entero; la
    // app es la única dueña de este origen, así que no hay nada ajeno
    // que preservar, y evita que la fuga vuelva con cada clave nueva.
    // ============================================================
    window.cerrarSesionTrost = function () {
        store.clear();

        document.cookie = "token=; path=/; Max-Age=0; SameSite=Lax";
    };

    // ============================================================
    // Decodificación y caducidad del token (Fase 4.1c)
    // Antes cada módulo repetía este parseo: 14 copias que en el fondo
    // eran lo mismo, repartidas en 10 variantes distintas. Devuelve el
    // payload si el token existe, es decodificable y no ha expirado; null
    // si no. No redirige ni borra nada: solo informa. Quien llama decide.
    // ============================================================
    window.leerPayloadToken = function () {
        var token = store.getItem("token");
        if (!token) return null;

        var partes = token.split(".");
        if (partes.length < 2) return null;

        try {
            var payload = JSON.parse(atob(partes[1]));

            // Sin exp no se puede probar la caducidad: se rechaza, igual
            // que harían los 14 guards originales con exp undefined.
            if (!payload || !payload.exp) return null;

            if (Date.now() >= payload.exp * 1000) return null;

            return payload;
        } catch (error) {
            console.error("Error al verificar el token:", error);
            return null;
        }
    };

    // ============================================================
    // Guard de carga (Fase 4.1c) — sustituye a las 14 copias de
    // verificarTokenAlCargar(). Se llama una vez por vista al cargar.
    //
    // - Sin token válido: cierra sesión y vuelve al login.
    // - Con token válido: refleja nombre y rol en la cabecera si la vista
    //   tiene esos elementos, y guarda id_usuario para los módulos que
    //   lo leen de localStorage.
    //
    // Los elementos se buscan con guarda porque no todas las vistas
    // tienen la cabecera de usuario: antes, una variante que los tocara
    // sin comprobarlos lanzaba TypeError y acababa en el catch, lo que
    // expulsaba al usuario de una vista perfectamente válida.
    // ============================================================
    window.verificarTokenAlCargar = function () {
        var payload = window.leerPayloadToken();

        if (!payload) {
            window.cerrarSesionTrost();
            window.location.href = "/";
            return null;
        }

        var nombre = document.getElementById("currentUserName");
        if (nombre) nombre.textContent = payload.nombre || "Usuario";

        var rol = document.getElementById("currentUserRole");
        if (rol) rol.textContent = payload.rol || "Rol";

        if (payload.id_usuario) {
            store.setItem("id_usuario", payload.id_usuario);
        }

        return payload;
    };

    window.fetch = async function (url, options) {
        options = options || {};

        var token = store.getItem("token");

        if (token) {
            var headers = new Headers(options.headers);
            if (!headers.has("Authorization")) {
                headers.set("Authorization", "Bearer " + token);
            }
            options.headers = headers;
        }

        var response = await originalFetch(url, options);

        if (response.status === 401 && String(url).indexOf("/loginusuario") === -1) {
            window.cerrarSesionTrost();
            if (window.location.pathname.indexOf("/login") === -1) {
                window.location.href = "/login";
            }
        }

        return response;
    };
})();