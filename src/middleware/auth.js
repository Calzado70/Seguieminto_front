/**
 * Protección de rutas del frontend (Fase 3.3)
 *
 * El JWT vive en localStorage, inaccesible para el servidor. Por eso este
 * middleware delega la verificación al backend, que es quien tiene el secreto
 * y la lógica de roles.
 *
 * Antes de renderizar una vista protegida:
 *   1. Comprueba que el navegador tenga un token (fallo rápido, sin red).
 *   2. Pide al backend que lo valide (/user/verificar).
 *   3. Solo si responde 200 deja continuar; en cualquier otro caso redirige
 *      a /login.
 *
 * Cache en memoria por token para no llamar al backend en cada navegación:
 * evita un round-trip por cada clic del menú manteniendo la validación real.
 */

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

const RUTAS_PUBLICAS = new Set(["/", "/login"]);

// Token -> { expiraEn, usuario }
const cache = new Map();
const TTL_CACHE_MS = 60 * 1000;

function limpiarCache() {
  const ahora = Date.now();

  for (const [token, entrada] of cache) {
    if (entrada.expiraEn <= ahora) cache.delete(token);
  }
}

function obtenerToken(req) {
  return req.cookies?.token || null;
}

function expirado(entrada) {
  return !entrada || entrada.expiraEn <= Date.now();
}

async function validarConBackend(token) {
  const entrada = cache.get(token);

  if (!expirado(entrada)) return entrada;

  try {
    const respuesta = await fetch(`${BACKEND_URL}/user/verificar`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!respuesta.ok) return null;

    const datos = await respuesta.json();

    cache.set(token, {
      usuario: datos.usuario || null,
      expiraEn: Date.now() + TTL_CACHE_MS,
    });

    return cache.get(token);
  } catch (error) {
    // Backend caído o inaccesible: no se entrega la vista protegida.
    console.error("[auth] No se pudo validar el token:", error.message);
    return null;
  }
}

export function requiereAutenticacion(req, res, next) {
  if (RUTAS_PUBLICAS.has(req.path)) return next();

  const token = obtenerToken(req);

  if (!token) {
    return res.redirect("/login");
  }

  validarConBackend(token)
    .then((entrada) => {
      if (!entrada) {
        cache.delete(token);
        res.clearCookie("token");
        return res.redirect("/login");
      }

      req.usuario = entrada.usuario;
      next();
    })
    .catch(() => res.redirect("/login"));
}

export { limpiarCache };
