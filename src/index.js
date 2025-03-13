import server from "./server.js"

server.listen(server.get("port"), ()=>{
    console.log(`Ejecutado en: http://localhost:${server.get("port")}`);    
})