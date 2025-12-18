// Botones del selector de productos.
const botonesTecla = document.querySelectorAll('.btnTecla');
// Botones de inserción de monedas.
const botonesMoneda = document.querySelectorAll('.btnMoneda');
// Boton de cancelar transacción.
const btnCancelar = document.getElementById('btnCancelar');
// Boton de confirmar compra
const btnConfirmar = document.getElementById('btnConfirmar');

// Nuestro saldo
let saldo = 0;
// Codigo del producot seleccionado
let codigo = '';

// Monedas insertadas en la maquina.
let monedasInsertadas = {
    0.05: 0,
    0.10: 0,
    0.20: 0,
    0.50: 0,
    1: 0,
    2: 0
};

// Actualizamos la pantalla de la maquina en codigo y saldo
function actualizarPantalla() {
    window.vending.actualizarSaldo(saldo);
    window.vending.actualizarCodigo(codigo);
}

// Manejamos los botones al seleccionar productos.
botonesTecla.forEach(btn => {
    btn.addEventListener('click', () => {
        const valor = btn.innerText;
        if (valor === 'Cancelar') {
            devolverMonedas();
        } else if (valor === 'Confirmar') {
            comprarProducto();
        } else {
            if (codigo.length < 3) {
                codigo += valor;
                actualizarPantalla();
            }
        }
    });
});

// Manejamos las monedas insertadas.
botonesMoneda.forEach(btn => {
    btn.addEventListener('click', () => {
        const valor = parseFloat(btn.innerText.replace('€',''));
        saldo += valor;
        // Guardamos las monedas que hemos metido en la maquina
        if (valor <= 2) monedasInsertadas[valor] = (monedasInsertadas[valor] || 0) + 1;
        actualizarPantalla();
    });
});

// Devolvemos las monedas al comprador.
function devolverMonedas() {
    if (saldo > 0) {
        window.vending.mostrarMensaje(`Devolviendo ${saldo.toFixed(2)}€`);
    }
    saldo = 0;
    codigo = '';
    monedasInsertadas = {0.05:0,0.10:0,0.20:0,0.50:0,1:0,2:0};
    actualizarPantalla();
}

// Calculamos el cambio a devolver en caso de que lo haya.
function calcularCambio(cambio, cambioMaquina) {
    let cambioADevolver = {};
    // para evitar problemas con decimales, trabajamos en centimos
    let restante = Math.round(cambio * 100);
    // céntimos, de mayor a menor
    const monedas = [200, 100, 50, 20, 10, 5]; 

    for (let m of monedas) {
        const valor = (m / 100).toFixed(2);
        let disponibles = cambioMaquina[valor] || 0;

        if (disponibles === 0) continue;

        let cantidad = 0;
        while (restante >= m && disponibles > 0) {
            restante -= m;
            disponibles--;
            cantidad++;
        }

        if (cantidad > 0) {
            cambioADevolver[valor] = cantidad;
        }
    }

    // Si no se pudo devolver todo el cambio, retornamos null
    if (restante > 0) return null;

    return cambioADevolver;
}


// Compramos el producto seleccionado
async function comprarProducto() {
    if(!codigo) return;

    // Obtenemos los productos.
    const productos = await window.vending.obtenerProductos();
    // Buscamos el producto seleccionado por su código.
    const producto = productos.find(p => String(p.codigo) === codigo);

    // Si no existe el producto para ese codigo, mostramos mensaje
    if(!producto) {
        window.vending.mostrarMensaje("Producto no encontrado");
        return;
    }

    // Si no hay stock mostramos mensaje.
    if(producto.stock <= 0) {
        window.vending.mostrarMensaje("Producto agotado");
        return;
    }

    // Si el saldo es insuficiente, mostrasmos mensaje.
    if(saldo < producto.precio) {
        window.vending.mostrarMensaje(`Saldo insuficiente. Precio: ${producto.precio}€`);
        return;
    }

    // Obtenemos el cambio disponible en la maquina
    let cambioDB = await window.vending.obtenerCambio();
    // Lo convertimos a un objeto para facilitar su uso
    let cambioMaquina = {};
    // Rellenamos el objeto con las cantidades actuales
    cambioDB.forEach(c => cambioMaquina[c.moneda] = c.cantidad);

    // Calculamos el cambio a devolver
    const cambioNecesario = saldo - producto.precio;
    // Si se necesita cambio, lo calculamos
    const cambio = cambioNecesario > 0 ? calcularCambio(cambioNecesario, cambioMaquina) : {};

    if(cambioNecesario > 0 && !cambio) {
        window.vending.mostrarMensaje("No hay suficiente cambio en la máquina");
        return;
    }

    // --- Restar monedas devueltas como cambio PRIMERO ---
    if (cambio) {
        for (let m in cambio) {
            await window.vending.actualizarCambio(m, -cambio[m]);
        }
    }

    // --- Sumar monedas insertadas del usuario DESPUÉS ---
    for (let m in monedasInsertadas) {
        if (monedasInsertadas[m] > 0) {
            await window.vending.actualizarCambio(m, monedasInsertadas[m]);
        }
    }

    // Reiniciar monedas insertadas
    monedasInsertadas = {0.05:0,0.10:0,0.20:0,0.50:0,1:0,2:0};

    // Actualizar stock del producto
    await window.vending.actualizarStock(producto.codigo, producto.stock - 1);

    // Mostrar mensaje total del cambio
    window.vending.mostrarMensaje(`Producto entregado. Cambio: ${cambioNecesario.toFixed(2)}€`);

    // Resetear saldo y código tras el mensaje
    setTimeout(async () => {
        saldo = 0;
        codigo = '';
        actualizarPantalla();
        await cargarProductos(); // recargar productos para reflejar stock actualizado
    }, 3000);
}


// Botón cancelar
btnCancelar.addEventListener('click', devolverMonedas);

// Botón confirmar
btnConfirmar.addEventListener('click', comprarProducto);

// Cargamos los productos en la pantalla
async function cargarProductos() {
    const productos = await window.vending.obtenerProductos();
    const contenedor = document.querySelector(".productos");
    contenedor.innerHTML = '';

    productos.sort((a, b) => Number(a.codigo) - Number(b.codigo));

    productos.forEach(p => {
        const slot = document.createElement("div");
        slot.classList.add("slot");
        // agregamos una clase CSS para los productos agotados
        if(p.stock <= 0) slot.classList.add("disabled"); 

        slot.innerHTML = `
            <div class="slot-img-wrapper">
                <img src="${p.img}" alt="${p.nombre}" class="slot-img">
            </div>
            <div class="info-linea">
                <span class="slot-codigo">${p.codigo}</span>
            </div>
        `;
        contenedor.appendChild(slot);
    });
}

// Panel de administador

// Boton para abrir el menu de administrador
const btnAdmin = document.querySelector('.btnAdmin');

// El propio panel
const adminPanel = document.getElementById('adminPanel');
// Boton para cerrar el panel de administrador
const btnCerrarAdmin = document.getElementById('btnCerrarAdmin');

// Abrimos el panel de administrador y cargamos los datos
btnAdmin.addEventListener('click', async () => {
    adminPanel.style.display = 'flex';
    await cargarAdminProductos();
    await cargarAdminCambio();
});

// Cerramos el panel de administrador
btnCerrarAdmin.addEventListener('click', () => {
    adminPanel.style.display = 'none';
});

// Cargamos los productos en el panel de administrador
async function cargarAdminProductos() {
    const productos = await window.vending.obtenerProductos();
    const contenedor = document.getElementById('adminProductos');
    contenedor.innerHTML = '';

    productos.forEach(p => {
        const div = document.createElement('div');
        div.classList.add('adminProducto');

        div.innerHTML = `
            <div>${p.nombre} (${p.codigo})</div>
            <div>
                Stock: <span id="stock-${p.codigo}">${p.stock}</span>
                <button class="btnReponer" data-codigo="${p.codigo}">Reponer</button>
            </div>
            <div>
                Precio: 
                <input type="number" step="0.01" min="0" id="input-precio-${p.codigo}" value="${p.precio}">
                <button class="btnGuardarPrecio" data-codigo="${p.codigo}">Guardar</button>
            </div>
        `;
        contenedor.appendChild(div);
    });

    // Añadimos un evento para reponer stock
    document.querySelectorAll('.btnReponer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const codigo = e.target.dataset.codigo;
            reponerStock(codigo, 20); // Reponer 20 por defecto
        });
    });

    // Añadimos un evento para guardar el precio nuevo.
    document.querySelectorAll('.btnGuardarPrecio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const codigo = e.target.dataset.codigo;
            const input = document.getElementById(`input-precio-${codigo}`);
            const nuevoPrecio = parseFloat(input.value);

            if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0) {
                await window.vending.actualizarPrecio(codigo, nuevoPrecio);
                window.vending.mostrarMensaje(`Precio actualizado a ${nuevoPrecio.toFixed(2)}€`);
                await cargarAdminProductos(); // recarga para reflejar cambios
            } else {
                window.vending.mostrarMensaje(`Precio inválido`);
            }
        });
    });
}


// Cargamos los datos del cambio en el panel.
async function cargarAdminCambio() {
    const cambio = await window.vending.obtenerCambio();
    const contenedor = document.getElementById('adminCambio');
    contenedor.innerHTML = '';

    // Por cada moneda.
    cambio.forEach(c => {
        const div = document.createElement('div');
        div.classList.add('adminMoneda');
        div.innerHTML = `
            <div> Monedas de ${c.moneda}€ : <span id="cantidad-${c.moneda}"> ${c.cantidad}</span></div>
            <div>
                <button class="btnReponerMoneda" data-moneda="${c.moneda}">Reponer</button>
                <button class="btnRetirarMoneda" data-moneda="${c.moneda}">Retirar</button>
            </div>
        `;
        contenedor.appendChild(div);
    });

    // Eventos para reponer monedas.
    document.querySelectorAll('.btnReponerMoneda').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const moneda = e.target.dataset.moneda;
            await reponerCambio(moneda);
        });
    });

    // Eventos para retirar monedas.
    document.querySelectorAll('.btnRetirarMoneda').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const moneda = e.target.dataset.moneda;
            await retirarCambio(moneda);
        });
    });
}

// Reponemos el stock de un producto
async function reponerStock(codigo, cantidad = 20) {
    await window.vending.actualizarStock(Number(codigo), cantidad);
    await cargarAdminProductos();
}

// Cambiamos el precio de un producto
async function cambiarPrecio(codigo) {
    const nuevo = prompt('Nuevo precio en €:');
    if (nuevo && !isNaN(nuevo)) {
        await window.vending.actualizarPrecio(Number(codigo), parseFloat(nuevo));
        await cargarAdminProductos();
    }
}

// Reponemos el cambio.
async function reponerCambio(moneda) {
    await window.vending.setCambio(moneda, 20);
    await cargarAdminCambio();
}

// Quitamos todo el cambio de la moneda seleccionada.
async function retirarCambio(moneda) {
    await window.vending.setCambio(moneda, 0);
    await cargarAdminCambio();
}

// Iniciamos la maquina al cargar la ventana.
window.addEventListener("DOMContentLoaded", async () => {
    await cargarProductos();
    actualizarPantalla();
});
