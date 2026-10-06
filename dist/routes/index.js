import { Router } from "express";
import rutaHome from "./ruta.home.js";

const ruta = Router();

ruta.use("/", rutaHome);

export default ruta;
