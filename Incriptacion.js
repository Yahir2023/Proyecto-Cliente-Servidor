const bcrypt = require("bcryptjs");

async function encriptarContraseña() {
    const contraseña = "12345"; // La contraseña en texto plano
    const salt = await bcrypt.genSalt(10);
    const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);
    console.log("Contraseña encriptada:", contraseñaEncriptada);
}

encriptarContraseña();
