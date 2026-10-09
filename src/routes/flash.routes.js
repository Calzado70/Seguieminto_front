import { Router } from "express";
import {
  archivo_plano,
  packing_list,
  entrega,
  inventario_inicial,
  materia,
} from "../controllers/home.controller.js";

const flashRoutes = Router();

flashRoutes.get("/plano", archivo_plano);
flashRoutes.get("/packing", packing_list);
flashRoutes.get("/entrega", entrega);
flashRoutes.get("/inicial", inventario_inicial);
flashRoutes.get("/materia", materia);

export default flashRoutes;