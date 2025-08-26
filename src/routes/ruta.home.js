import { Router } from "express";
import { alerta, crear_bodegas, historial, inventario, inventario_inicial, inventario_view, login, logistica, modi_bodegas, modificar, registrar, seguimiento, session, supervisor } from "../controllers/home.controller.js";

const rutaHome = Router();

rutaHome.get("/usuario", inventario);
rutaHome.get("/modificar", modificar);
rutaHome.get("/modi_bodegas", modi_bodegas);  
rutaHome.get("/crear_bodega", crear_bodegas);
rutaHome.get("/producto", registrar); //puede que ya no sea necesario
rutaHome.get("/supervisor", supervisor);
rutaHome.get("/historial", historial);  
rutaHome.get("/alerta", alerta); //puede que ya no sea necesario
rutaHome.get("/seguimiento", seguimiento);
rutaHome.get("/logistica", logistica);
// rutaHome.get("/inyeccion",producto_inyec);
rutaHome.get("/", login);
rutaHome.get("/inicial",inventario_inicial);



rutaHome.get("/inventario", inventario_view);
rutaHome.get("/sesion", session);

export default rutaHome;
