import { config } from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import ruta from "./routes/index.js";
import { requiereAutenticacion } from "./middleware/auth.js";
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// URL del backend disponible en todas las vistas como `backendUrl`.
// El partial head.ejs la inyecta al navegador en window.__BACKEND_URL__,
// que es lo que consume public/js/api.js. Asi el JS del cliente deja de
// hardcodear http://localhost:4000 (Fase 4.1) y el .env sigue sin
// exponerse entero al navegador.
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(
    /\/+$/,
    ""
);

app.locals.backendUrl = BACKEND_URL;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));



app.set("port", process.env.PORT || 3000);

app.use(cookieParser());

app.use("/", requiereAutenticacion, ruta);

// Middleware para manejar rutas no encontradas (404).
// Se registra despues del router, por lo que solo recibe peticiones que
// ningun controlador atendio. Queda fuera de la proteccion para que una
// URL inexistente muestre el 404 en vez de redirigir al login.
app.use((req, res, next) => {
    res.status(404).render('views.error.404.ejs');
});


export default app;