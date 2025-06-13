export const login = (req, res) => {
    res.render("views.login.ejs");
}

export const inventario = (req, res) => {
    res.render("views.crear.usuario.ejs");
};

export const modificar = (req, res) => {
    res.render("views.modificar.usuarios.ejs");
}

export const modi_bodegas = (req, res) => {
    res.render("views.modificar.bodegas.ejs");
}

export const crear_bodegas = (req, res) => {
    res.render("views.crear.bodegas.ejs");
}

export const registrar = (req, res) => {
    res.render("views.reg.producto.ejs");
}

export const supervisor = (req, res) => {
    res.render("views.producto.ejs");
}


export const historial = (req, res) => {
    res.render("views.historial.ejs");
}

export const alerta = (req, res) => {
    res.render("views.alerta.ejs");
}

export const seguimiento = (req, res) => {
    res.render("views.seguimiento.ejs");
}

export const logistica = (req, res) => {
    res.render("views.logistica.ejs");
}