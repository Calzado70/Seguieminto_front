import { config } from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import ruta from "./routes/index.js";
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));



app.set("port", process.env.PORT || 3000);

app.use("/", ruta);

// Middleware para manejar rutas no encontradas (404)
app.use((req, res, next) => {
    res.status(404).render('views.error.404.ejs');
});


export default app;