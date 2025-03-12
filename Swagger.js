const swaggerAutogen = require("swagger-autogen")();

const doc = {
    info: {
        title: "Mi API",
        description: "Documentación generada automáticamente",
    },
    host: "localhost:3000",
    schemes: ["http"],
};

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./index.js"]; // O el archivo principal de tu servidor

swaggerAutogen(outputFile, endpointsFiles).then(() => {
    console.log("✅ Documentación generada correctamente");
});
