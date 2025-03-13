import { Router } from "express";
import { alerta, crear_bodegas, historial, inventario, login, modi_bodegas, modificar, registrar, supervisor } from "../controllers/home.controller.js";

const rutaHome = Router();

rutaHome.get("/usuario", inventario);
rutaHome.get("/modificar", modificar);
rutaHome.get("/modi_bodegas", modi_bodegas);  
rutaHome.get("/crear_bodega", crear_bodegas);
rutaHome.get("/producto", registrar);
rutaHome.get("/supervisor", supervisor);
rutaHome.get("/historial", historial);  
rutaHome.get("/alerta", alerta);
rutaHome.get("/", login);

export default rutaHome;
