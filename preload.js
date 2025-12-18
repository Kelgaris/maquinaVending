// Importamos las herramientas de electron
const { contextBridge, ipcRenderer } = require('electron');

// Variable para manejar el timeout de los mensajes temporales
let mensajeTimeout;

// Exponemos funciones seguras al navegador (renderer) a través de preload
contextBridge.exposeInMainWorld('vending', {
    
    // Actualizamos el saldo en pantalla
    actualizarSaldo: (saldo) => {
        const saldoElem = document.getElementById('saldo');
        saldoElem.innerText = saldo.toFixed(2) + '€';
        if (saldo === 0) saldoElem.innerText = '0.00€';
    },

    // Actualizamos el código en pantalla
    actualizarCodigo: (codigo) => {
        const codigoElem = document.getElementById('codigo');
        codigoElem.innerText = codigo || '---';
    },

    // Mostramos mensajes temporales en pantalla
    mostrarMensaje: (mensaje, duracion = 3000) => {
        const mensajeElem = document.getElementById('mensajeTemporal');

        // Cancelamos cualquier mensaje anterior
        if (mensajeTimeout) clearTimeout(mensajeTimeout);

        // Mostramos el mensaje
        mensajeElem.innerText = mensaje;

        // Tras duracion se limpia el mensaje
        mensajeTimeout = setTimeout(() => {
            mensajeElem.innerText = '';
            mensajeTimeout = null;
        }, duracion);
    },

    // Obtenemos todos los productos desde MongoDB
    obtenerProductos: () => ipcRenderer.invoke('obtener-productos'),

    // Obtenemos el estado del cambio desde MongoDB
    obtenerCambio: () => ipcRenderer.invoke('obtener-cambio'),

    // Actualizamos el stock de un producto en MongoDB
    actualizarStock: (codigo, cantidad) => ipcRenderer.invoke('actualizar-stock', codigo, cantidad),

    // Actualizamos la cantidad de monedas de un tipo en MongoDB
    actualizarCambio: (moneda, cantidad) => ipcRenderer.invoke('actualizar-cambio', moneda, cantidad),
    
    // Actualizamos el precio de un producto
    actualizarPrecio: (codigo, precio) => ipcRenderer.invoke('actualizar-precio', codigo, precio),
    
    //Actualizamos las cantidades de las monedas
    setCambio: (moneda, cantidad) => ipcRenderer.invoke('set-cambio', moneda, cantidad),
});