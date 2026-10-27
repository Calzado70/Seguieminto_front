import { Router } from "express";
import { crear_bodegas, 
    entrega, 
    historial, 
    inventario, 
    inventario_inicial, 
    inventario_supervisor, 
    inventario_view, 
    ajustar_inventario,
    login, 
    logistica,  
    materia,
    modi_bodegas, 
    modificar, 
    packing_list, 
    registrar, 
    seguimiento, 
    session, 
    supervisor, 
    archivo_plano,
    catalogo,
    caracteristicas,
    consumoTerminadaCompleto,
    importacion,
    productos
  } from "../controllers/home.controller.js";

const rutaHome = Router();

rutaHome.get("/usuario", inventario);
rutaHome.get("/modificar", modificar);
rutaHome.get("/modi_bodegas", modi_bodegas);  
rutaHome.get("/crear_bodega", crear_bodegas);
rutaHome.get("/producto", registrar); //puede que ya no sea necesario
rutaHome.get("/supervisor", supervisor);
rutaHome.get("/historial", historial);  
rutaHome.get("/seguimiento", seguimiento);
rutaHome.get("/logistica", logistica);
rutaHome.get("/consumo-terminada-completo", consumoTerminadaCompleto);
rutaHome.get("/inventario_supervisor", inventario_supervisor);
// rutaHome.get("/inyeccion",producto_inyec);

//LOGIN
rutaHome.get("/", login);
rutaHome.get("/login", login);


//Packing List O Ineventario
rutaHome.get("/plano", archivo_plano);
rutaHome.get("/packing", packing_list);
rutaHome.get("/entrega", entrega);
rutaHome.get("/inicial",inventario_inicial);
rutaHome.get("/materia", materia);


//Catalogo
rutaHome.get("/catalogo", catalogo);

//Caracteristicas
rutaHome.get("/caracteristicas", caracteristicas);

//Importación masiva de datos
rutaHome.get("/importar", importacion);

//Lista de productos (tabla productos)
rutaHome.get("/productos", productos);


rutaHome.get("/inventario", inventario_view);
rutaHome.get("/ajustar-inventario", ajustar_inventario);
rutaHome.get("/sesion", session);

export default rutaHome;
