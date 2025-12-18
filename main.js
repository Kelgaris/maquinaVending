// Importaciones de módulos necesarios.
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
// Módulo para manejar rutas de archivos.
const path = require('path');
// Módulo para interactuar con MongoDB.
const { MongoClient } = require('mongodb');
// Módulo para cargar variables de entorno desde un archivo .env
const dotenv = require('dotenv');
dotenv.config();

// Conexión a MongoDB usando la URI desde las variables de entorno.
const mongo_uri = process.env.MONGO_URI;
const client = new MongoClient(process.env.MONGO_URI);

// Recogemos los productos desde la base de datos.
async function obtenerProductos() {
    await client.connect();
    const db = client.db('MaquinaVending');
    const productos = db.collection('productos');
    return await productos.find({}).toArray();
}

// Obtenemos el cambio desde la base de datos.
async function obtenerCambio() {
    await client.connect();
    const db = client.db('MaquinaVending');
    const cambio = db.collection('cambio');
    return await cambio.find({}).toArray();
}

// Actualizamos el stock de un producto en la base de datos.
async function actualizarStock(codigo, nuevaCantidad) {
    await client.connect();
    const db = client.db('MaquinaVending');
    const productos = db.collection('productos');
    await productos.updateOne({ codigo: codigo }, { $set: { stock: nuevaCantidad } });
}

// Actualizamos las monedas de cambio en la base de datos.
async function actualizarCambio(moneda, cantidad) {
    await client.connect();
    const db = client.db('MaquinaVending');
    const cambio = db.collection('cambio');
    await cambio.updateOne({ moneda: moneda }, { $inc: { cantidad: cantidad } });
}

// IPC handlers (Comnunicación entre el archivo main y renderer)
ipcMain.handle('obtener-productos', async () => await obtenerProductos());
ipcMain.handle('obtener-cambio', async () => await obtenerCambio());
ipcMain.handle('actualizar-stock', async (event, codigo, nuevaCantidad) => {
    await actualizarStock(codigo, nuevaCantidad);
});
ipcMain.handle('actualizar-cambio', async (event, moneda, cantidad) => {
    await actualizarCambio(moneda, cantidad);
});

// Actualizamos el preico de un producto
ipcMain.handle('actualizar-precio', async (event, codigo, precio) => {
    await client.connect();
    const db = client.db('MaquinaVending');
    const productos = db.collection('productos');
    await productos.updateOne({ codigo: Number(codigo) }, { $set: { precio: precio } });
    return true;
});

// Modificamos la cantidad de monedas.
ipcMain.handle('set-cambio', async (event, moneda, cantidad) => {
    await client.connect();
    const db = client.db('MaquinaVending');
    const cambio = db.collection('cambio');
    await cambio.updateOne({ moneda: moneda }, { $set: { cantidad: cantidad } }, { upsert: true });
    return true;
});

// Creamos la ventana principal de la aplicación.
function createWindow(){
    const win = new BrowserWindow({
        width:1800,
        height:1600,
        webPreferences:{
            preload: path.join(__dirname,'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname,'src/img/favicon.png')
    });

    // Cargamos el archivo HTML principal.
    win.loadFile('index.html');

    // Quitamos el menú superior
    Menu.setApplicationMenu(null);
}

// Esperamos a que la aplicación esté lista para crear la ventana.
app.whenReady().then(createWindow);

// Cerramos la aplicación cuando todas las ventanas estén cerradas.
app.on('window-all-closed',()=>{
    if(process.platform !== 'darwin') app.quit();
});

// Reabrimos la aplicación si se hace clic en el icono.
app.on('activate', ()=>{
    if(BrowserWindow.getAllWindows().length === 0) createWindow();
});
