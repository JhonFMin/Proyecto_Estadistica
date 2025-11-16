// Reemplaza TODO tu main.js con esto
const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: 'var(--color-toast-bg, #1f2937)',
    color: 'var(--color-toast-text, #ffffff)',
    customClass: {
        popup: 'rounded-xl border border-white/20 shadow-2xl',
        container: 'mt-5'
    },
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

let datosActualesGlobal = {};

// --- Animación de Conteo (Tu función) ---
function animarValor(id, valorFinal) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    // Si no es un número (ej: "Amodal", "Regular", "--"), asigna directo.
    if (!Estadistica.esNumero(valorFinal)) {
        elemento.innerText = valorFinal;
        return;
    }

    const finalValue = parseFloat(valorFinal);
    const duration = 800;
    let startTime = null;

    const finalValueStr = String(valorFinal);
    const decimalIndex = finalValueStr.indexOf('.');
    const decimalPlaces = decimalIndex > 0 ? finalValueStr.length - 1 - decimalIndex : 0;

    const startValue = 0;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);

        let currentValue = startValue + (finalValue - startValue) * percentage;

        elemento.innerText = currentValue.toFixed(decimalPlaces);

        if (progress < duration) {
            window.requestAnimationFrame(step);
        } else {
            elemento.innerText = finalValue.toFixed(decimalPlaces);
        }
    }
    window.requestAnimationFrame(step);
}

// --- FUNCIÓN PRINCIPAL (Ahora ASYNC y CORREGIDA) ---
// En main.js

async function procesarDatos(modoAutomatico = false) { // <--- PARÁMETRO NUEVO
    const textoRaw = document.getElementById('data-input').value;
    let datosCrudos = textoRaw.split(/,\s*|\n+/).map(val => val.trim()).filter(val => val !== "");

    if (datosCrudos.length === 0) {
        Toast.fire({ icon: 'error', title: 'No hay datos válidos para analizar' });
        return;
    }

    // --- 1. DETECCIÓN ---
    let conteoNumeros = 0;
    datosCrudos.forEach(d => {
        if (Estadistica.esNumero(d)) conteoNumeros++;
    });
    const esCuantitativaDetectada = (conteoNumeros / datosCrudos.length) > 0.9;

    let esCuantitativa = esCuantitativaDetectada;

    // --- 2. CONFIRMACIÓN (SOLO SI NO ES AUTOMÁTICO) ---
    // Si NO es automático, preguntamos. Si ES automático, nos saltamos esto.
    if (!modoAutomatico) {
        const tipoDetectado = esCuantitativaDetectada ? "Cuantitativa (Números)" : "Cualitativa (Texto)";
        const iconoDetectado = esCuantitativaDetectada ? "fa-calculator" : "fa-font";

        const { isConfirmed, isDenied } = await Swal.fire({
            title: 'Tipo de Variable Detectada',
            html: `
                <div class="text-center">
                    <div class="text-4xl text-indigo-600 mb-2 dark:text-indigo-400"><i class="fa-solid ${iconoDetectado}"></i></div>
                    <p class="text-slate-600 mb-4 dark:text-slate-300">He analizado tus datos y parecen ser:</p>
                    <h3 class="text-xl font-bold text-slate-800 mb-4 dark:text-white">${tipoDetectado}</h3>
                    <p class="text-xs text-slate-400">¿Cómo quieres procesarlos?</p>
                </div>
            `,
            showDenyButton: true,
            confirmButtonText: `Sí, analizar como ${esCuantitativaDetectada ? 'Números' : 'Texto'}`,
            denyButtonText: `No, forzar como ${esCuantitativaDetectada ? 'Texto' : 'Números'}`,
            confirmButtonColor: '#3b82f6',
            denyButtonColor: '#94a3b8',
            customClass: { popup: 'rounded-2xl dark:bg-slate-800 dark:text-white' }
        });

        if (isDenied) {
            esCuantitativa = !esCuantitativaDetectada;
        } else if (!isConfirmed) {
            return;
        }
    }
    // Si es automático, simplemente confiamos en 'esCuantitativaDetectada'

    // --- 3. PROCESAMIENTO ---
    const tipoDatoFinal = esCuantitativa ? 'cuantitativo' : 'cualitativo';
    const badge = document.getElementById('badge-tipo-dato');
    const quantCards = document.querySelectorAll('.quant-only');

    let media, mediana, rango, varianza, desviacion;
    let mediaStr, medianaStr, modaStr, rangoStr, varianzaStr, desviacionStr;

    let tabla;
    let datosParaGraficos = [];
    let datosParaAyuda = [];

    if (esCuantitativa) {
        const datosNum = datosCrudos.map(num => parseFloat(num)).filter(num => !isNaN(num));
        datosParaGraficos = datosNum;
        datosParaAyuda = datosNum;

        const esDiscreto = datosNum.every(num => Number.isInteger(num));
        const tipoVariable = esDiscreto ? "Cuantitativa Discreta" : "Cuantitativa Continua";

        // --- LEER CONFIGURACIÓN MUESTRA/POBLACIÓN ---
        const radioPoblacion = document.querySelector('input[name="tipo-calculo"][value="poblacion"]');
        const esPoblacion = radioPoblacion ? radioPoblacion.checked : false;

        media = Estadistica.media(datosNum);
        mediana = Estadistica.mediana(datosNum);
        const modaObj = Estadistica.moda(datosNum, tipoDatoFinal);
        rango = Estadistica.rango(datosNum);

        // Usamos el booleano esPoblacion
        varianza = Estadistica.varianza(datosNum, media, esPoblacion);
        desviacion = Estadistica.desviacion(varianza);
        tabla = Estadistica.tablaFrecuencias(datosNum, true);

        mediaStr = media.toFixed(2);
        medianaStr = mediana.toFixed(2);
        modaStr = modaObj.valor;
        rangoStr = rango.toFixed(2);
        varianzaStr = varianza.toFixed(2);
        desviacionStr = desviacion.toFixed(2);

        quantCards.forEach(card => card.classList.remove('hidden'));
        document.querySelectorAll('.qual-only').forEach(card => card.classList.add('hidden'));

        badge.innerText = tipoVariable;
        badge.className = esDiscreto
            ? "bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide"
            : "bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide";

        generarInterpretacion(datosNum, media, desviacion, rango);

    } else {
        const datosTexto = datosCrudos;
        datosParaGraficos = [];
        datosParaAyuda = datosTexto;

        tabla = Estadistica.tablaFrecuencias(datosTexto, false);
        const modaObj = Estadistica.moda(datosTexto, tipoDatoFinal);

        const resultadoOrdinal = Estadistica.analisisOrdinal(datosTexto);
        const cardMedianaOrd = document.getElementById('card-mediana-ordinal');

        quantCards.forEach(card => card.classList.add('hidden'));
        document.querySelectorAll('.qual-only').forEach(card => card.classList.remove('hidden'));

        if (resultadoOrdinal) {
            badge.innerText = "Variable Cualitativa Ordinal";
            badge.className = "bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide";
            cardMedianaOrd.classList.remove('hidden');
            document.getElementById('val-mediana-ordinal').innerText = resultadoOrdinal.mediana;
            medianaStr = resultadoOrdinal.mediana;
            mediana = resultadoOrdinal.mediana;
        } else {
            badge.innerText = "Variable Cualitativa Nominal";
            badge.className = "bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide";
            cardMedianaOrd.classList.add('hidden');
            medianaStr = "--";
            mediana = null;
        }

        const topCat = tabla[0];
        const minCat = tabla[tabla.length - 1];
        document.getElementById('val-total-cats').innerText = tabla.length;

        if (topCat.fi === minCat.fi) {
            document.getElementById('val-top-cat').innerText = "Empate";
            document.getElementById('val-top-pct').innerText = "Todos igual";
            document.getElementById('val-min-cat').innerText = "--";
        } else {
            document.getElementById('val-top-cat').innerText = topCat.x;
            document.getElementById('val-top-pct').innerText = `${topCat.pi}% del total`;
            document.getElementById('val-min-cat').innerText = minCat.x;
        }

        mediaStr = rangoStr = varianzaStr = desviacionStr = "--";
        modaStr = modaObj.valor;
        media = rango = varianza = desviacion = null;

        let textoInterpretacion = `Análisis de <strong>${datosTexto.length} datos cualitativos</strong>.<br>`;
        if (resultadoOrdinal) textoInterpretacion += `Se detectó un <strong>orden jerárquico</strong>.<br>`;
        if (topCat.fi !== minCat.fi) textoInterpretacion += `La categoría predominante es <strong>"${topCat.x}"</strong>.`;
        document.getElementById('analisis-texto').innerHTML = textoInterpretacion;
    }

    badge.classList.remove('hidden');

    mostrarResultados(mediaStr, medianaStr, modaStr, rangoStr, varianzaStr, desviacionStr);
    generarTablaHTML(tabla);
    generarGraficos(tabla, datosParaGraficos, tipoDatoFinal);
    actualizarBotonesAyuda(datosParaAyuda, media, rango, varianza, desviacion, mediana, modaStr);

    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('results-panel').classList.remove('hidden');

    // Solo mostramos la alerta de éxito si NO es automático (para no saturar)
    if (!modoAutomatico) {
        Toast.fire({ icon: 'success', title: esCuantitativa ? 'Análisis Numérico Completo' : 'Análisis Cualitativo Completo' });
    }
}
// --- EL RESTO DE TU MAIN.JS (Tus funciones de ayuda) ---

function mostrarResultados(media, mediana, moda, rango, varianza, dev) {
    animarValor('val-media', media);
    animarValor('val-mediana', mediana);
    animarValor('val-moda', moda);
    animarValor('val-rango', rango);
    animarValor('val-varianza', varianza);
    animarValor('val-desviacion', dev);
}
function generarInterpretacion(datos, media, desviacion, rango) {
    const n = datos.length;
    // Calculamos el CV
    const cvVal = (media !== 0) ? ((desviacion / media) * 100) : 0;
    const cv = cvVal.toFixed(2);

    let dispersionText = "";
    if (media === 0) {
        dispersionText = "no se puede calcular (media es cero)";
    } else if (cvVal < 15) {
        dispersionText = "baja (datos homogéneos)";
    } else if (cvVal < 30) {
        dispersionText = "moderada";
    } else {
        dispersionText = "alta (datos heterogéneos)";
    }

    // --- AQUÍ ESTÁ EL CAMBIO ---
    // Creamos el botón de ayuda pequeñito color índigo
    const btnAyuda = `
        <button onclick="verFormula('cv')" 
                class="inline-flex items-center justify-center w-5 h-5 ml-1 rounded-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 transition-colors" 
                title="Ver fórmula del CV">
            <i class="fa-regular fa-circle-question text-sm"></i>
        </button>
    `;

    const texto = `
        Se analizaron un total de <strong>${n} datos</strong>. El promedio obtenido es de <strong>${media.toFixed(2)}</strong>.
        <br><br>
        En cuanto a la dispersión, los datos varían en un rango de <strong>${rango.toFixed(2)}</strong> unidades.
        El coeficiente de variación es del <strong>${cv}%</strong>${btnAyuda}, lo que indica una dispersión <strong>${dispersionText}</strong> con respecto a la media.
    `;
    document.getElementById('analisis-texto').innerHTML = texto;
}
function generarTablaHTML(tabla) {
    const tbody = document.getElementById('frequency-table-body');
    tbody.innerHTML = "";

    // Variables para acumular los totales
    let sumaFi = 0;
    let sumaHi = 0;
    let sumaPi = 0;

    // 1. Generar las filas normales y sumar
    tabla.forEach(fila => {
        // Acumulamos valores (nos aseguramos que sean números)
        sumaFi += parseFloat(fila.fi);
        sumaHi += parseFloat(fila.hi);
        sumaPi += parseFloat(fila.pi);

        const row = `
            <tr class="bg-white border-b hover:bg-gray-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300">
                <td class="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">${fila.x}</td>
                <td class="px-6 py-4 text-blue-600 font-semibold dark:text-blue-400">${fila.fi}</td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${fila.Fi}</td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${fila.hi}</td>
                <td class="px-6 py-4"><div class="flex items-center"><span class="mr-2 text-xs font-bold dark:text-slate-300">${fila.pi}%</span><div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-slate-600"><div class="bg-orange-500 h-1.5 rounded-full" style="width: ${fila.pi}%"></div></div></div></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // 2. Ajuste de redondeo para que se vea bonito (hi ~ 1.00, pi ~ 100%)
    // A veces la suma da 99.9 o 100.1 por decimales, así que redondeamos visualmente
    const totalHiStr = sumaHi.toFixed(4);
    const totalPiStr = Math.round(sumaPi) + "%";

    // 3. Agregar la fila de TOTALES al final
    const filaTotal = `
        <tr class="bg-orange-50 border-t-2 border-orange-300 font-bold text-slate-900 dark:bg-slate-900 dark:border-orange-700 dark:text-white">
            <td class="px-6 py-4 text-right uppercase text-xs tracking-wider text-orange-700 dark:text-orange-400">TOTAL</td>
            <td class="px-6 py-4 text-orange-700 dark:text-orange-400">${sumaFi}</td>
            <td class="px-6 py-4 text-slate-400 font-normal">--</td>
            <td class="px-6 py-4 text-orange-700 dark:text-orange-400">${totalHiStr}</td>
            <td class="px-6 py-4 text-orange-700 dark:text-orange-400">${totalPiStr}</td>
        </tr>
    `;

    tbody.innerHTML += filaTotal;
}
function agregarDatosAlInput(nuevosDatos) {
    const input = document.getElementById('data-input');
    const valorActual = input.value.trim();

    // Si ya hay datos, agrega una nueva línea (\n) y luego los nuevos.
    // Si está vacío, solo pone los nuevos.
    // NUNCA borra lo anterior.
    input.value = valorActual.length > 0 ? valorActual + "\n" + nuevosDatos : nuevosDatos;
}

function cargarDemo() {
    // Banco de generadores de datos para darle mucha variedad
    const generadores = {
        // 1. CUALITATIVA NOMINAL (Sin orden: Colores, Marcas, Frutas...)
        nominal: [
            () => { // Frutas
                const items = ['Manzana', 'Pera', 'Banano', 'Uva', 'Naranja', 'Sandía', 'Melón', 'Kiwi', 'Mango'];
                return Array.from({ length: 30 }, () => items[Math.floor(Math.random() * items.length)]);
            },
            () => { // Marcas Deportivas
                const items = ['Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour', 'New Balance', 'Fila'];
                return Array.from({ length: 30 }, () => items[Math.floor(Math.random() * items.length)]);
            },
            () => { // Redes Sociales
                const items = ['Facebook', 'Instagram', 'TikTok', 'Twitter', 'LinkedIn', 'Snapchat'];
                return Array.from({ length: 35 }, () => items[Math.floor(Math.random() * items.length)]);
            }
        ],

        // 2. CUALITATIVA ORDINAL (Con jerarquía: Tallas, Satisfacción, Educación...)
        ordinal: [
            () => { // Satisfacción
                const items = ['Muy Insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', 'Muy Satisfecho'];
                return Array.from({ length: 30 }, () => items[Math.floor(Math.random() * items.length)]);
            },
            () => { // Tallas de Ropa
                const items = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
                return Array.from({ length: 40 }, () => items[Math.floor(Math.random() * items.length)]);
            },
            () => { // Frecuencia
                const items = ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente', 'Siempre'];
                return Array.from({ length: 30 }, () => items[Math.floor(Math.random() * items.length)]);
            },
            () => { // Nivel Educativo
                const items = ['Primaria', 'Secundaria', 'Pregrado', 'Posgrado', 'Doctorado'];
                return Array.from({ length: 25 }, () => items[Math.floor(Math.random() * items.length)]);
            }
        ],

        // 3. CUANTITATIVA DISCRETA (Números enteros: Hijos, Mascotas, Edad...)
        discreta: [
            () => { // Número de hijos o mascotas (0 a 8)
                return Array.from({ length: 40 }, () => Math.floor(Math.random() * 9));
            },
            () => { // Edades de un salón de clases (17 a 25)
                return Array.from({ length: 50 }, () => Math.floor(Math.random() * (25 - 17 + 1) + 17));
            },
            () => { // Goles en un partido (0 a 5)
                return Array.from({ length: 30 }, () => Math.floor(Math.random() * 6));
            }
        ],

        // 4. CUANTITATIVA CONTINUA (Números con decimales: Estatura, Temperatura, Peso...)
        continua: [
            () => { // Estaturas en metros (1.50 a 1.95)
                return Array.from({ length: 30 }, () => (Math.random() * (1.95 - 1.50) + 1.50).toFixed(2));
            },
            () => { // Temperaturas (35.0 a 40.0)
                return Array.from({ length: 25 }, () => (Math.random() * (40.0 - 35.0) + 35.0).toFixed(1));
            },
            () => { // Notas definitivas (0.0 a 5.0)
                return Array.from({ length: 35 }, () => (Math.random() * 5.0).toFixed(1));
            }
        ]
    };

    // --- LÓGICA DE LA RULETA ---

    // 1. Elegir una de las 4 grandes categorías al azar
    const categorias = ['nominal', 'ordinal', 'discreta', 'continua'];
    const categoriaElegida = categorias[Math.floor(Math.random() * categorias.length)];

    // 2. Elegir un escenario específico dentro de esa categoría (ej: Tallas dentro de Ordinal)
    const opcionesDisponibles = generadores[categoriaElegida];
    const generadorSeleccionado = opcionesDisponibles[Math.floor(Math.random() * opcionesDisponibles.length)];

    // 3. ¡Generar los datos!
    const datosNuevos = generadorSeleccionado();

    // 4. Enviarlos al input (se suman a lo que ya haya)
    agregarDatosAlInput(datosNuevos.join(', '));

    // 5. Mostrar mensaje bonito según lo que salió
    let tituloToast = "";
    let iconoToast = "success";

    switch (categoriaElegida) {
        case 'nominal':
            tituloToast = '🎲 ¡Generado! Datos Cualitativos Nominales';
            iconoToast = "info";
            break;
        case 'ordinal':
            tituloToast = '📊 ¡Generado! Datos Ordinales (Jerarquía)';
            iconoToast = "warning";
            break;
        case 'discreta':
            tituloToast = '🔢 ¡Generado! Datos Discretos (Enteros)';
            break;
        case 'continua':
            tituloToast = '📏 ¡Generado! Datos Continuos (Decimales)';
            break;
    }

    Toast.fire({ icon: iconoToast, title: tituloToast });
}
function limpiarDatos() {
    // ESTA es la única función que tiene permiso de borrar todo
    document.getElementById('data-input').value = "";
    document.getElementById('file-upload').value = "";

    // Reseteamos la vista
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('results-panel').classList.add('hidden');

    Toast.fire({ icon: 'warning', title: 'Todo limpio. Lista vacía.' });
}
// REEMPLAZA LA FUNCIÓN ANTIGUA procesarArchivo POR ESTA:

function procesarArchivoUnificado(input) {
    if (input.files.length === 0) return;
    const archivo = input.files[0];
    const nombre = archivo.name.toLowerCase();

    // CASO 1: ES UNA SESIÓN (.JSON)
    if (nombre.endsWith('.json')) {
        Sesion.importar(input); // Reutilizamos la lógica de importar sesión
        return;
    }

    // CASO 2: SON DATOS (EXCEL/CSV/TXT)
    // Definir qué hacer cuando se lean los datos
    const alTerminarCarga = (datosLeidos) => {
        agregarDatosAlInput(datosLeidos);
        toggleInput('manual');
        Toast.fire({ icon: 'success', title: 'Datos agregados a la lista' });
        input.value = "";
    };

    if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls')) {
        const lector = new FileReader();
        lector.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const primeraHoja = workbook.SheetNames[0];
                const hoja = workbook.Sheets[primeraHoja];
                const datosJson = XLSX.utils.sheet_to_json(hoja, { header: 1 });
                let listaPlana = datosJson.flat().join(", ");
                alTerminarCarga(listaPlana);
            } catch (e) {
                Toast.fire({ icon: 'error', title: 'Error al leer el Excel' });
            }
        };
        lector.readAsArrayBuffer(archivo);
    } else {
        // TXT o CSV
        const lector = new FileReader();
        lector.onload = function (e) {
            alTerminarCarga(e.target.result);
        };
        lector.readAsText(archivo);
    }
}

function toggleInput(mode) {
    const manualBtn = document.getElementById('btn-manual');
    const fileBtn = document.getElementById('btn-file');
    const manualDiv = document.getElementById('input-manual-container');
    const fileDiv = document.getElementById('input-file-container');
    if (mode === 'manual') {
        manualBtn.className = "flex-1 py-2 px-3 rounded-md bg-white shadow text-slate-800 transition-all font-medium dark:bg-slate-700 dark:text-white";
        fileBtn.className = "flex-1 py-2 px-3 rounded-md text-slate-500 hover:text-slate-700 transition-all dark:text-slate-400 dark:hover:text-slate-200";
        manualDiv.classList.remove('hidden');
        fileDiv.classList.add('hidden');
    } else {
        fileBtn.className = "flex-1 py-2 px-3 rounded-md bg-white shadow text-slate-800 transition-all font-medium dark:bg-slate-700 dark:text-white";
        manualBtn.className = "flex-1 py-2 px-3 rounded-md text-slate-500 hover:text-slate-700 transition-all dark:text-slate-400 dark:hover:text-slate-200";
        fileDiv.classList.remove('hidden');
        manualDiv.classList.add('hidden');
    }
}

function verAyudaFormato() {
    Swal.fire({
        title: 'Formatos Aceptados',
        width: '750px', // Un poco más ancho para que quepan 3 columnas
        html: `
            <div class="text-left text-sm text-slate-600 dark:text-slate-300 space-y-4">
                <p>El sistema detecta automáticamente el tipo de archivo que subes:</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 dark:bg-slate-700 dark:border-slate-600">
                        <strong class="block text-orange-600 mb-1 text-xs flex items-center gap-2 dark:text-orange-400"><i class="fa-regular fa-file-lines"></i> TXT / CSV</strong>
                        <p class="text-[10px] text-slate-500 mb-2 dark:text-slate-400">Datos simples:</p>
                        <code class="block bg-white p-1.5 rounded border border-slate-200 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300">10, 20, 30...</code>
                    </div>

                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 dark:bg-slate-700 dark:border-slate-600">
                        <strong class="block text-green-600 mb-1 text-xs flex items-center gap-2 dark:text-green-400"><i class="fa-solid fa-file-excel"></i> Excel (.xlsx)</strong>
                        <p class="text-[10px] text-slate-500 mb-2 dark:text-slate-400">Columna A:</p>
                        <code class="block bg-white p-1.5 rounded border border-slate-200 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300">A1: 10<br>A2: 15</code>
                    </div>

                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 dark:bg-slate-700 dark:border-slate-600">
                        <strong class="block text-purple-600 mb-1 text-xs flex items-center gap-2 dark:text-purple-400"><i class="fa-solid fa-code"></i> Sesión (.json)</strong>
                        <p class="text-[10px] text-slate-500 mb-2 dark:text-slate-400">Respaldo completo:</p>
                        <div class="text-[10px] leading-tight opacity-80">Restaura tus datos, nombre de sesión y configuración (Muestra/Población) al instante.</div>
                    </div>

                </div>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ea580c',
        customClass: { popup: 'rounded-2xl dark:bg-slate-800 dark:text-white' }
    });
}

function verAtajos() {
    Swal.fire({
        title: 'Atajos de Teclado',
        html: `
            <div class="text-left space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div class="flex justify-between items-center border-b border-slate-100 pb-2"><span>Analizar datos</span><kbd class="bg-slate-100 px-2 py-1 rounded border border-slate-300 font-mono text-xs dark:bg-slate-700 dark:border-slate-600">Enter</kbd></div>
                <div class="flex justify-between items-center border-b border-slate-100 pb-2"><span>Separar números</span><kbd class="bg-slate-100 px-2 py-1 rounded border border-slate-300 font-mono text-xs dark:bg-slate-700 dark:border-slate-600">Espacio</kbd></div>
                <div class="flex justify-between items-center border-b border-slate-100 pb-2"><span>Analizar (Global)</span><kbd class="bg-slate-100 px-2 py-1 rounded border border-slate-300 font-mono text-xs dark:bg-slate-700 dark:border-slate-600">Ctrl + Enter</kbd></div>
                <div class="flex justify-between items-center"><span>Modo Oscuro</span><div class="text-xs text-orange-500">Clic en la Luna 🌙</div></div>
            </div>
        `,
        icon: 'question',
        confirmButtonText: '¡Genial!',
        confirmButtonColor: '#3b82f6',
        customClass: { popup: 'rounded-2xl dark:bg-slate-800 dark:text-white' }
    });
}

if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

function toggleDarkMode() {
    const html = document.documentElement;
    const icon = document.getElementById('dark-mode-icon');
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
        icon.className = "fa-regular fa-moon";
    } else {
        html.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
        icon.className = "fa-regular fa-sun";
    }
}

// --- 1. CONECTOR SEGURO DEL BOTÓN (Pon esto DENTRO de tu evento DOMContentLoaded existente) ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (tu código existente de drag & drop, etc) ...

    // AGREGA ESTO: Conectar el botón de exportar de forma segura
    const btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', (e) => {
            e.preventDefault(); // ¡Detiene cualquier recarga!
            exportarPDF();
        });
    }
});


async function exportarPDF(e) {
    // 1. PREVENIR RECARGA
    if (e && e.preventDefault) e.preventDefault();

    // 2. Validación
    if (document.getElementById('results-panel').classList.contains('hidden')) {
        Toast.fire({ icon: 'warning', title: 'Primero analiza algunos datos.' });
        return;
    }

    Toast.fire({ icon: 'info', title: 'Generando PDF...' });

    // Guardamos estado original
    const isDark = document.documentElement.classList.contains('dark');
    const originalTextColor = isDark ? '#cbd5e1' : '#334155';
    const originalGridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const chartsActivos = [chartHistograma, chartBoxPlot, chartPastel];

    // --- FUNCIÓN DE CAMBIO DE COLOR AGRESIVA ---
    const setChartColor = (chart, colorText, colorGrid) => {
        if (!chart) return;

        // 1. Color Global (Importante para leyendas generales)
        chart.options.color = colorText;
        chart.options.borderColor = colorGrid;

        // 2. Ejes X e Y
        if (chart.options.scales) {
            ['x', 'y'].forEach(axis => {
                if (chart.options.scales[axis]) {
                    // Ticks (Los números)
                    if (chart.options.scales[axis].ticks) {
                        chart.options.scales[axis].ticks.color = colorText;
                        // Forzamos opacidad completa
                        chart.options.scales[axis].ticks.textStrokeColor = 'transparent'; 
                    }
                    // Grid (La rejilla) - La hacemos más oscura para que se vea en papel
                    if (chart.options.scales[axis].grid) {
                        chart.options.scales[axis].grid.color = colorGrid;
                        chart.options.scales[axis].grid.borderColor = colorText; // La línea del borde
                    }
                    // Títulos (Texto "Distribución")
                    if (chart.options.scales[axis].title) {
                        chart.options.scales[axis].title.color = colorText;
                    }
                }
            });
        }

        // 3. Leyenda
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = colorText;
        }

        chart.update(); // Actualización completa (sin 'none')
    };

    try {
        // === PASO 1: CAMBIAR A MODO IMPRESIÓN (NEGRO Y GRIS OSCURO) ===
        // Usamos un gris fuerte para la rejilla (0.5) para que se note en el PDF
        chartsActivos.forEach(c => setChartColor(c, '#ffffffff', 'rgba(44, 43, 43, 0.5)'));

        // === PASO 2: LA ESPERA MÁGICA (ESTO ARREGLA EL PROBLEMA) ===
        // Esperamos 500ms para asegurar que el navegador repinte los gráficos en negro
        await new Promise(resolve => setTimeout(resolve, 500));

        // === PASO 3: CREAR EL PDF ===
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let currentY = 15;
        const colorPrimary = [234, 88, 12];
        const colorSecondary = [30, 41, 59];
        const colorTableHead = [234, 88, 12];

        // Encabezado
        doc.setFillColor(...colorPrimary);
        doc.rect(0, 0, pageWidth, 5, 'F');
        currentY += 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(...colorSecondary);
        doc.text("Informe de Análisis Estadístico", margin, currentY);

        currentY += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Universidad de La Guajira | Facultad de Ingeniería", margin, currentY);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });

        currentY += 10;
        doc.setDrawColor(200);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;

        // Metodología
        const tipoCalculo = document.querySelector('input[name="tipo-calculo"]:checked').value;
        const esPoblacion = tipoCalculo === 'poblacion';
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 35, 3, 3, 'F');
        doc.setFontSize(11);
        doc.setTextColor(...colorPrimary);
        doc.text("Resumen Ejecutivo", margin + 5, currentY + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60);
        const analisisTexto = document.getElementById('analisis-texto').innerText;
        const splitTexto = doc.splitTextToSize(analisisTexto, pageWidth - (margin * 2) - 10);
        doc.text(splitTexto, margin + 5, currentY + 16);
        const formulaTexto = esPoblacion ? "Nota: Cálculo Poblacional (N)" : "Nota: Cálculo Muestral (n-1)";
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(formulaTexto, margin + 5, currentY + 31);

        currentY += 45;

        // Tabla de Datos
        const valMedia = document.getElementById('val-media').innerText;
        const valMediana = document.getElementById('val-mediana').innerText;
        const valModa = document.getElementById('val-moda').innerText;
        const valRango = document.getElementById('val-rango').innerText;
        const valVarianza = document.getElementById('val-varianza').innerText;
        const valDesviacion = document.getElementById('val-desviacion').innerText;
        let valCV = "--";
        try {
            const m = parseFloat(valMedia);
            const s = parseFloat(valDesviacion);
            if (m !== 0) valCV = ((s / m) * 100).toFixed(2) + "%";
        } catch (e) { }

        doc.autoTable({
            startY: currentY,
            head: [['Medida', 'Valor', 'Medida', 'Valor']],
            body: [
                ['Media', valMedia, 'Rango', valRango],
                ['Mediana', valMediana, 'Varianza', valVarianza],
                ['Moda', valModa, 'Desviación Estándar', valDesviacion],
                ['', '', 'Coef. Variación', valCV]
            ],
            theme: 'grid',
            headStyles: { fillColor: colorTableHead, textColor: 255, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: colorSecondary },
                1: { halign: 'center' },
                2: { fontStyle: 'bold', textColor: colorSecondary },
                3: { halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        // Tabla Frecuencias
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colorSecondary);
        doc.text("Tabla de Frecuencias", margin, currentY);
        currentY += 3;

        doc.autoTable({
            html: '#frequency-table-body',
            startY: currentY,
            head: [['Dato', 'fi', 'Fi', 'hi', '%']],
            theme: 'grid',
            headStyles: { fillColor: colorTableHead, textColor: 255, halign: 'center' },
            styles: { fontSize: 9, halign: 'center', cellPadding: 2 },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        // === PASO 4: CAPTURA DE GRÁFICOS (CON FONDO BLANCO FORZADO) ===
        const agregarGrafico = (canvasId, titulo) => {
            const canvas = document.getElementById(canvasId);
            if (canvas && canvas.width > 0) {
                if (currentY + 100 > 280) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...colorSecondary);
                doc.text(titulo, margin, currentY);

                // Escala 2x (Retina) para calidad y eficiencia
                const scale = 2;
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = canvas.width * scale;
                tempCanvas.height = canvas.height * scale;
                const ctx = tempCanvas.getContext("2d");

                // FONDO BLANCO SÓLIDO (Vital para que las letras negras se vean)
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

                const imgData = tempCanvas.toDataURL("image/jpeg", 0.95);
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = pageWidth - (margin * 2);
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.addImage(imgData, 'JPEG', margin, currentY + 5, pdfWidth, pdfHeight);
                tempCanvas.remove();
                currentY += pdfHeight + 20;
            }
        };

        if (chartHistograma) agregarGrafico('mainChart', 'Distribución de Frecuencias');
        if (chartBoxPlot && document.getElementById('boxPlotChart').parentNode.style.display !== 'none') {
            agregarGrafico('boxPlotChart', 'Análisis de Dispersión');
        }
        if (chartPastel) agregarGrafico('pieChart', 'Composición Porcentual');

        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount} - Reporte Generado Automáticamente`, pageWidth / 2, 290, { align: 'center' });
        }

        doc.save('Informe_Estadistico_Uniguajira.pdf');
        Toast.fire({ icon: 'success', title: '¡Informe descargado con éxito!' });

    } catch (error) {
        console.error(error);
        Toast.fire({ icon: 'error', title: 'Error al generar PDF.' });
    } finally {
        // === PASO 5: RESTAURAR COLORES (CON OTRA ESPERA) ===
        // Volvemos a poner los colores bonitos de la web
        chartsActivos.forEach(c => setChartColor(c, originalTextColor, originalGridColor));
    }
}
function actualizarBotonesAyuda(datos, media, rango, varianza, desviacion, mediana, moda) {
    // Esta función guarda los datos (numéricos o de texto) para los popups de "Paso a paso"
    datosActualesGlobal = {
        datos: datos, // array de datos
        media: media, // número o null
        rango: rango, // número o null
        varianza: varianza, // número o null
        desviacion: desviacion, // número o null
        mediana: mediana, // número o string (ordinal) o null
        moda: moda // string (valor de la moda)
    };
}

// En main.js, reemplaza TODA la función verFormula con esta:

function verFormula(tipo) {
    let titulo = "";
    let formulaGenerica = "";
    let calculoReal = "";
    let color = "";
    let explicacion = "";

    const d = datosActualesGlobal;

    if (!d.datos || d.datos.length === 0) {
        Toast.fire({ icon: 'info', title: 'Calcula primero para ver el paso a paso.' });
        return;
    }

    // Validaciones de seguridad
    if (tipo !== 'moda' && tipo !== 'mediana' && d.media === null) {
        Toast.fire({ icon: 'error', title: 'Este cálculo no aplica para datos cualitativos.' });
        return;
    }
    if (tipo === 'mediana' && d.mediana === null) {
        Toast.fire({ icon: 'error', title: 'La mediana no aplica para datos nominales.' });
        return;
    }

    // DETECTAR QUÉ RADIO BUTTON ESTÁ MARCADO
    // Esto es lo que arregla el error: leemos el estado actual del selector
    const radioPoblacion = document.querySelector('input[name="tipo-calculo"][value="poblacion"]');
    const esPoblacion = radioPoblacion ? radioPoblacion.checked : false;

    switch (tipo) {
        case 'media':
            titulo = "Media Aritmética";
            color = "#3b82f6";
            // La fórmula visual cambia ligeramente la notación (µ vs x̄)
            formulaGenerica = esPoblacion ? "$$\\mu = \\frac{\\sum x_i}{N}$$" : "$$\\bar{x} = \\frac{\\sum x_i}{n}$$";
            calculoReal = Estadistica.generarPasoPaso('media', d.datos, d.media.toFixed(2));
            explicacion = "Suma de todos los datos dividida entre la cantidad total.";
            break;

        case 'mediana':
            titulo = "Mediana";
            color = "#a855f7";
            formulaGenerica = "$$\\tilde{x} = \\text{Dato Central (ordenado)}$$";
            explicacion = "Es el valor que queda justo en medio al ordenar los datos de menor a mayor.";
            if (typeof d.mediana === 'string') {
                calculoReal = `$$ \\text{Valor central (ordinal)} = ${d.mediana} $$`;
            } else {
                calculoReal = Estadistica.generarPasoPaso('mediana', d.datos, d.mediana.toFixed(2));
            }
            break;

        case 'moda':
            titulo = "Moda";
            color = "#ec4899";
            formulaGenerica = "$$\\text{Mo} = \\text{Valor más repetido}$$";
            calculoReal = Estadistica.generarPasoPaso('moda', d.datos, d.moda);
            explicacion = "Es el dato que tiene la mayor frecuencia absoluta (el que más se repite).";
            break;

        case 'rango':
            titulo = "Rango";
            color = "#10b981";
            formulaGenerica = "$$R = x_{max} - x_{min}$$";
            calculoReal = Estadistica.generarPasoPaso('rango', d.datos, d.rango.toFixed(2));
            explicacion = "Diferencia entre el valor más grande y el más pequeño.";
            break;

        // --- AQUÍ ESTÁ LA CORRECCIÓN CLAVE PARA VARIANZA ---
        case 'varianza':
            titulo = esPoblacion ? "Varianza Poblacional" : "Varianza Muestral";
            color = "#06b6d4";

            if (esPoblacion) {
                // Fórmula de Población (N)
                formulaGenerica = "$$\\sigma^2 = \\frac{\\sum (x_i - \\mu)^2}{N}$$";
                explicacion = "Suma de diferencias al cuadrado dividida por el total exacto (N).";
                // Pasamos 'true' al final para indicar Población
                calculoReal = Estadistica.generarPasoPaso('varianza', d.datos, d.varianza.toFixed(2), d.media, true);
            } else {
                // Fórmula de Muestra (n-1)
                formulaGenerica = "$$s^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n - 1}$$";
                explicacion = "Suma de diferencias al cuadrado dividida por (n-1) para corregir el sesgo.";
                // Pasamos 'false' al final para indicar Muestra
                calculoReal = Estadistica.generarPasoPaso('varianza', d.datos, d.varianza.toFixed(2), d.media, false);
            }
            break;

        case 'desviacion':
            titulo = esPoblacion ? "Desviación Estándar (Población)" : "Desviación Estándar (Muestra)";
            color = "#f97316";
            formulaGenerica = esPoblacion ? "$$\\sigma = \\sqrt{\\sigma^2}$$" : "$$s = \\sqrt{s^2}$$";
            calculoReal = Estadistica.generarPasoPaso('desviacion', d.datos, d.desviacion.toFixed(2), d.varianza);
            explicacion = "La raíz cuadrada de la varianza. Nos devuelve a la unidad original de los datos.";
            break;
        case 'cv':
            titulo = "Coeficiente de Variación";
            color = "#6366f1"; // Color Indigo

            // Objeto auxiliar con los datos que necesita la fórmula
            const paramsCV = {
                desv: d.desviacion.toFixed(2),
                media: d.media.toFixed(2)
            };

            if (esPoblacion) {
                formulaGenerica = "$$CV = \\frac{\\sigma}{\\mu} \\times 100\\%$$";
                explicacion = "Relación porcentual entre la desviación estándar poblacional y la media.";
                // Pasamos 'true' al final para indicar Población
                calculoReal = Estadistica.generarPasoPaso('cv', null, ((d.desviacion / d.media) * 100).toFixed(2), paramsCV, true);
            } else {
                formulaGenerica = "$$CV = \\frac{s}{\\bar{x}} \\times 100\\%$$";
                explicacion = "Relación porcentual entre la desviación estándar muestral y el promedio.";
                // Pasamos 'false' al final para indicar Muestra
                calculoReal = Estadistica.generarPasoPaso('cv', null, ((d.desviacion / d.media) * 100).toFixed(2), paramsCV, false);
            }
            break;


        default: return;
    }

    Swal.fire({
        title: `<span style="color:${color}">${titulo}</span>`,
        html: `
            <div class="text-left space-y-4">
                <p class="text-sm text-slate-600 dark:text-slate-300">${explicacion}</p>
                <div class="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Fórmula General</div>
                <div class="p-3 rounded-lg border border-slate-200 flex justify-center items-center overflow-x-auto" style="background-color: #f8fafc;"> 
                    <span class="text-lg text-slate-700">${formulaGenerica}</span>
                </div>
                <div class="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 mt-4">Cálculo con tus datos</div>
                <div class="p-6 rounded-xl border border-slate-700 shadow-inner flex justify-start items-center overflow-x-auto relative custom-scroll" style="background-color: #1e293b; white-space: nowrap;"> 
                    <span class="absolute top-2 right-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full z-10 shadow-lg">Ejemplo real</span>
                    <div class="text-xl text-white px-4 py-2">${calculoReal}</div>
                </div>
                <p class="text-[10px] text-slate-400 mt-1 text-right italic">Desliza horizontalmente para ver todo ➡</p>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false,
        width: '90%',
        customClass: { popup: 'rounded-2xl dark:bg-slate-900 dark:border dark:border-slate-700' },
        didOpen: () => { if (window.MathJax) MathJax.typesetPromise(); }
    });
}




async function exportarPDF(e) {
    // 1. Prevenir recarga
    if (e && e.preventDefault) e.preventDefault();

    // 2. Validación
    if (document.getElementById('results-panel').classList.contains('hidden')) {
        Toast.fire({ icon: 'warning', title: 'Primero analiza algunos datos.' });
        return;
    }

    // Notificación de carga
    Swal.fire({
        title: 'Generando PDF...',
        text: 'Optimizando gráficos para impresión.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    // --- PASO 1: PREPARAR EL ENTORNO (CAMALEÓN) ---
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    const chartsActivos = [chartHistograma, chartBoxPlot, chartPastel];

    // A. Forzamos temporalmente el MODO CLARO en toda la página
    // Esto obliga a Chart.js a usar sus bases claras (adiós gris pálido)
    if (wasDark) {
        html.classList.remove('dark');
    }

    // B. Función para inyectar NEGRO PURO (#000000)
    const forcePrintColors = (chart) => {
        if (!chart) return;
        const black = '#000000';
        const darkGrid = 'rgba(0, 0, 0, 0.3)';

        // 1. Globales
        chart.options.color = black;
        chart.options.borderColor = darkGrid;

        // 2. Ejes
        if (chart.options.scales) {
            Object.keys(chart.options.scales).forEach(key => {
                const scale = chart.options.scales[key];
                if (scale.ticks) {
                    scale.ticks.color = black;
                    scale.ticks.textStrokeColor = 'transparent';
                }
                if (scale.grid) {
                    scale.grid.color = darkGrid;
                    scale.grid.borderColor = black;
                }
                if (scale.title) scale.title.color = black;
            });
        }
        // 3. Leyendas
        if (chart.options.plugins?.legend?.labels) {
            chart.options.plugins.legend.labels.color = black;
        }
        chart.update('none');
    };

    try {
        // C. Aplicar cambios
        // Primero actualizamos al tema claro estándar
        if (typeof actualizarColoresGraficos === 'function') actualizarColoresGraficos();
        
        // Luego sobrescribimos con NEGRO PURO para impresión
        chartsActivos.forEach(forcePrintColors);

        // D. Espera vital (El "Parpadeo")
        // Necesitamos que el navegador repinte el canvas en blanco y negro
        await new Promise(resolve => setTimeout(resolve, 800));

        // --- PASO 2: GENERAR PDF ---
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let currentY = 15;

        const colorPrimary = [234, 88, 12]; 
        const colorSecondary = [30, 41, 59];
        const colorTableHead = [234, 88, 12];

        // Encabezado
        doc.setFillColor(...colorPrimary);
        doc.rect(0, 0, pageWidth, 5, 'F');
        currentY += 10;

        // Logo
        const logoImgTag = document.querySelector('aside img');
        if(logoImgTag) {
            try {
                const c = document.createElement('canvas');
                c.width = logoImgTag.naturalWidth;
                c.height = logoImgTag.naturalHeight;
                const ctx = c.getContext('2d');
                ctx.drawImage(logoImgTag, 0, 0);
                const logoData = c.toDataURL('image/png');
                doc.addImage(logoData, 'PNG', margin, currentY, 18, 18);
            } catch(e){}
        }

        const textX = margin + 22;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(...colorSecondary);
        doc.text("Informe de Análisis Estadístico", textX, currentY + 6);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Universidad de La Guajira | Facultad de Ingeniería", textX, currentY + 12);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, pageWidth - margin, currentY + 12, { align: 'right' });

        currentY += 25;
        doc.setDrawColor(200);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;

        // Metodología
        const tipoCalculo = document.querySelector('input[name="tipo-calculo"]:checked').value;
        const esPoblacion = tipoCalculo === 'poblacion';
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 35, 3, 3, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(...colorPrimary);
        doc.text("Análisis de Datos y Conclusiones", margin + 5, currentY + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60);
        const analisisTexto = document.getElementById('analisis-texto').innerText;
        const splitTexto = doc.splitTextToSize(analisisTexto, pageWidth - (margin * 2) - 10);
        doc.text(splitTexto, margin + 5, currentY + 16);
        
        const formulaTexto = esPoblacion ? "Metodología: Cálculo Poblacional (N)" : "Metodología: Cálculo Muestral (n-1)";
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(formulaTexto, margin + 5, currentY + 31);
        currentY += 45;

        // Tabla Datos
        const valMedia = document.getElementById('val-media').innerText;
        const valMediana = document.getElementById('val-mediana').innerText;
        const valModa = document.getElementById('val-moda').innerText;
        const valRango = document.getElementById('val-rango').innerText;
        const valVarianza = document.getElementById('val-varianza').innerText;
        const valDesviacion = document.getElementById('val-desviacion').innerText;
      let valCV = "--"; // Valor por defecto si falla
        try {
            // Limpiamos cualquier texto extra y convertimos a número
            const m = parseFloat(valMedia);
            const s = parseFloat(valDesviacion);

            // Verificamos que sean números válidos y que la media no sea 0
            if (!isNaN(m) && !isNaN(s) && m !== 0) {
                valCV = ((s / m) * 100).toFixed(2) + "%";
            }
        } catch (e) { }

        doc.autoTable({
            startY: currentY,
            head: [['Medida', 'Valor', 'Medida', 'Valor']],
            body: [
                ['Media', valMedia, 'Rango', valRango],
                ['Mediana', valMediana, 'Varianza', valVarianza],
                ['Moda', valModa, 'Desviación Estándar', valDesviacion],
                ['', '', 'Coef. Variación', valCV]
            ],
            theme: 'grid',
            headStyles: { fillColor: colorTableHead, textColor: 255, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', textColor: colorSecondary }, 2: { fontStyle: 'bold', textColor: colorSecondary } }
        });
        currentY = doc.lastAutoTable.finalY + 15;

        // Tabla Frecuencias
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colorSecondary);
        doc.text("Tabla de Frecuencias", margin, currentY);
        currentY += 3;
        doc.autoTable({
            html: '#frequency-table-body',
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: colorTableHead, textColor: 255, halign: 'center' },
            styles: { fontSize: 9, halign: 'center', cellPadding: 2 },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });
        currentY = doc.lastAutoTable.finalY + 15;

        // Gráficos (JPEG 0.95 HD)
        const agregarGrafico = (canvasId, titulo) => {
            const canvas = document.getElementById(canvasId);
            if (canvas && canvas.width > 0) {
                if (currentY + 110 > 280) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...colorSecondary);
                doc.text(titulo, margin, currentY);
                
                const scale = 2;
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = canvas.width * scale;
                tempCanvas.height = canvas.height * scale;
                const ctx = tempCanvas.getContext("2d");
                
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

                const imgData = tempCanvas.toDataURL("image/jpeg", 0.95);
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = pageWidth - (margin * 2);
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.addImage(imgData, 'JPEG', margin, currentY + 5, pdfWidth, pdfHeight);
                tempCanvas.remove();
                currentY += pdfHeight + 25;
            }
        };

        if(chartHistograma) agregarGrafico('mainChart', '1. Distribución de Frecuencias');
        const boxCanvas = document.getElementById('boxPlotChart');
        if(chartBoxPlot && boxCanvas && !boxCanvas.parentNode.classList.contains('hidden')) {
            agregarGrafico('boxPlotChart', '2. Análisis de Dispersión');
        }
        if(chartPastel) agregarGrafico('pieChart', '3. Composición Porcentual');

        // Créditos
        if (currentY + 40 > 280) { doc.addPage(); currentY = 20; } else { currentY += 10; }
        doc.setDrawColor(234, 88, 12);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colorSecondary);
        doc.text("CRÉDITOS DEL PROYECTO", margin, currentY);
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text("Desarrollado por: Jhon Mindiola, Yeleinys Gomez", margin, currentY);
        currentY += 5;
        doc.text("Asignatura: Estadística y Probabilidad - Grupo [E2]", margin, currentY);

        // Numeración
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
        }

        doc.save('Informe_Estadistico_Uniguajira.pdf');
        
        Swal.close(); // Cerrar loading
        Toast.fire({ icon: 'success', title: '¡Informe descargado con éxito!' });

    } catch (error) {
        console.error(error);
        Swal.close();
        Toast.fire({ icon: 'error', title: 'Error al generar PDF.' });
    } finally {
        // --- PASO 3: RESTAURAR EL TEMA ORIGINAL ---
        if (wasDark) {
            html.classList.add('dark');
        }
        // Restaurar colores de gráficos al tema correspondiente
        if (typeof actualizarColoresGraficos === 'function') actualizarColoresGraficos();
    }
}
function verManualUsuario() {
    Swal.fire({
        title: '<strong>Manual de Usuario 2.0</strong>',
        width: '850px', // Un poco más ancho para que quepa la info nueva
        html: `
            <div class="text-left text-sm text-slate-600 dark:text-slate-300 space-y-6 px-2 max-h-[60vh] overflow-y-auto custom-scroll">
                
                <div class="flex gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div class="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex-shrink-0 flex items-center justify-center font-bold"><i class="fa-solid fa-database"></i></div>
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-white text-base">1. Fuente de Datos Inteligente</h3>
                        <p class="mt-1 text-xs">El sistema ahora reconoce automáticamente lo que ingresas:</p>
                        <ul class="list-disc pl-5 mt-1 space-y-1 text-xs">
                            <li><strong>Manual:</strong> Escribe números separados por comas, espacios o Enter.</li>
                            <li><strong>Importar Excel/TXT:</strong> Arrastra archivos <code>.xlsx</code> o <code>.csv</code> al área punteada para cargar los datos.</li>
                            <li><strong>Restaurar Respaldo (.json):</strong> Arrastra un archivo de sesión <code>.json</code> para recuperar instantáneamente tus datos, nombre de sesión y configuración.</li>
                        </ul>
                    </div>
                </div>

                <div class="flex gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold"><i class="fa-solid fa-sliders"></i></div>
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-white text-base">2. Configuración Estadística</h3>
                        <p class="mt-1 text-xs">Define el contexto matemático antes de analizar:</p>
                        <ul class="list-disc pl-5 mt-1 space-y-1 text-xs">
                            <li><strong>Muestra (n-1):</strong> Úsalo para encuestas o subconjuntos de datos. (Calcula Varianza Muestral S²).</li>
                            <li><strong>Población (N):</strong> Úsalo si tienes TODOS los datos del universo estudiado. (Calcula Varianza Poblacional σ²).</li>
                        </ul>
                    </div>
                </div>

                <div class="flex gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div class="w-10 h-10 rounded-full bg-green-100 text-green-600 flex-shrink-0 flex items-center justify-center font-bold"><i class="fa-solid fa-floppy-disk"></i></div>
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-white text-base">3. Gestión de Sesiones (Persistencia)</h3>
                        <p class="mt-1 text-xs">No pierdas tu progreso. Usa la barra inferior izquierda:</p>
                        <div class="grid grid-cols-3 gap-2 mt-2 text-center">
                            <div class="bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                                <i class="fa-solid fa-save text-orange-500 mb-1"></i>
                                <div class="font-bold text-[10px]">Guardar</div>
                                <div class="text-[9px] opacity-70">En navegador</div>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                                <i class="fa-solid fa-folder-open text-blue-500 mb-1"></i>
                                <div class="font-bold text-[10px]">Abrir</div>
                                <div class="text-[9px] opacity-70">Historial local</div>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                                <i class="fa-solid fa-download text-green-500 mb-1"></i>
                                <div class="font-bold text-[10px]">Exportar</div>
                                <div class="text-[9px] opacity-70">Archivo .json</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4 items-start">
                    <div class="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex-shrink-0 flex items-center justify-center font-bold"><i class="fa-solid fa-chart-simple"></i></div>
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-white text-base">4. Interactividad y Reportes</h3>
                        <ul class="list-disc pl-5 mt-1 space-y-1 text-xs">
                            <li><strong>Zoom y Arrastre:</strong> Usa la rueda del mouse sobre el Histograma o el Boxplot para hacer zoom. Haz clic y arrastra para moverte por los datos.</li>
                            <li><strong>Paso a Paso:</strong> Haz clic en los signos de interrogación <i class="fa-regular fa-circle-question text-indigo-400"></i> para ver la fórmula matemática aplicada con tus números reales.</li>
                            <li><strong>PDF:</strong> El botón "Exportar Informe" genera un documento profesional con todos los cálculos y gráficos, listo para entregar.</li>
                        </ul>
                    </div>
                </div>

            </div>
        `,
        showCloseButton: true,
        focusConfirm: false,
        confirmButtonText: '¡Entendido, a trabajar!',
        confirmButtonColor: '#3b82f6',
        customClass: { popup: 'rounded-2xl dark:bg-slate-900 dark:text-white' }
    });
}
function verAyudaBoxplot() {
    Swal.fire({
        title: '<span class="text-indigo-600">¿Cómo leer este gráfico?</span>',
        width: '700px',
        html: `
            <div class="text-left text-sm text-slate-600 dark:text-slate-300 space-y-4">
                <p>El <strong>Diagrama de Caja (Boxplot)</strong> resume cómo están distribuidos tus datos dividiéndolos en 4 partes iguales (cuartiles).</p>
                
                <div class="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center dark:bg-slate-800 dark:border-slate-600">
                    
                    <div class="relative w-full h-12 flex items-center justify-center mb-2">
                        <div class="h-0.5 bg-slate-400 w-1/4"></div>
                        <div class="h-3 w-0.5 bg-slate-800 dark:bg-slate-200"></div> <div class="h-10 w-1/2 bg-indigo-500/80 border-2 border-indigo-600 relative flex items-center justify-center">
                            <div class="h-full w-0.5 bg-white absolute left-1/3"></div>
                        </div>
                        
                        <div class="h-0.5 bg-slate-400 w-1/4"></div>
                        <div class="h-3 w-0.5 bg-slate-800 dark:bg-slate-200"></div> <div class="absolute right-0 w-3 h-3 rounded-full border-2 border-red-500 bg-transparent" title="Dato Atípico"></div>
                    </div>

                    <div class="w-full flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Mínimo</span>
                        <span class="text-indigo-500">Q1 (25%)</span>
                        <span class="text-indigo-600">Mediana (50%)</span>
                        <span class="text-indigo-500">Q3 (75%)</span>
                        <span>Máximo</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-100 dark:bg-slate-700 dark:border-slate-600">
                        <strong class="text-indigo-700 dark:text-indigo-300 block mb-1">📦 La Caja (Q1 a Q3)</strong>
                        Aquí vive la "gente normal". Representa el <strong>50% central</strong> de tus datos. Si es muy ancha, tus datos están muy dispersos.
                    </div>
                    <div class="bg-slate-100 p-3 rounded-lg border border-slate-200 dark:bg-slate-700 dark:border-slate-600">
                        <strong class="text-slate-700 dark:text-slate-200 block mb-1">➖ Los Bigotes</strong>
                        Se extienden hasta el dato más pequeño y el más grande que <strong>no sean raros</strong>.
                    </div>
                    <div class="bg-white p-3 rounded-lg border border-slate-200 dark:bg-slate-700 dark:border-slate-600">
                        <strong class="text-slate-700 dark:text-slate-200 block mb-1">📍 Mediana (Línea)</strong>
                        Es el centro exacto. La mitad de los datos está a su izquierda y la otra mitad a su derecha.
                    </div>
                    <div class="bg-red-50 p-3 rounded-lg border border-red-100 dark:bg-slate-700 dark:border-slate-600">
                        <strong class="text-red-600 dark:text-red-400 block mb-1">⭕ Puntos (Outliers)</strong>
                        Son datos atípicos o errores. Están tan lejos que se salen de la "normalidad" estadística.
                    </div>
                </div>
            </div>
        `,
        showCloseButton: true,
        confirmButtonText: '¡Entendido!',
        confirmButtonColor: '#4f46e5', // Indigo
        customClass: {
            popup: 'rounded-2xl dark:bg-slate-900 dark:border dark:border-slate-700'
        }
    });
}// ... (al final de main.js)

// --- OBSERVADOR DE CAMBIO DE TEMA (MODO OSCURO/CLARO) ---
// Este código detecta automáticamente cuándo se añade o quita la clase 'dark'
// del tag <html> y le dice a los gráficos que actualicen sus colores.

try {
    // 1. Define el "observador" y lo que debe hacer
    const themeObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {

                // Revisa si la función existe (buena práctica)
                if (typeof actualizarColoresGraficos === 'function') {
                    // Llama a la función en charts.js para actualizar colores
                    actualizarColoresGraficos();
                }
            }
        }
    });

    // 2. Inicia el "observador"
    // Le decimos que vigile el tag <html> y solo se fije en cambios de "class"
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
    });

} catch (e) {
    console.error("Error al iniciar el observador de tema:", e);
}
const Sesion = {
    // 1. Guardar (SIN CAMBIOS)
    guardar: () => {
        const nombre = document.getElementById('session-name').value.trim();
        const datos = document.getElementById('data-input').value.trim();

        if (!datos) return Toast.fire({ icon: 'warning', title: 'No hay datos para guardar' });
        if (!nombre) return Toast.fire({ icon: 'warning', title: 'Ponle un nombre a la sesión' });

        const tipoCalculo = document.querySelector('input[name="tipo-calculo"]:checked').value;

        const sesionData = {
            id: Date.now(),
            nombre: nombre,
            datos: datos,
            config: tipoCalculo,
            fecha: new Date().toLocaleDateString()
        };

        let historial = JSON.parse(localStorage.getItem('stats_sessions') || "[]");

        const existeIndex = historial.findIndex(s => s.nombre.toLowerCase() === nombre.toLowerCase());
        if (existeIndex >= 0) {
            historial[existeIndex] = sesionData;
            Toast.fire({ icon: 'success', title: 'Sesión actualizada' });
        } else {
            historial.push(sesionData);
            Toast.fire({ icon: 'success', title: 'Nueva sesión guardada' });
        }
        localStorage.setItem('stats_sessions', JSON.stringify(historial));
    },

    // 2. Listar (SIN CAMBIOS)
    listar: () => {
        const historial = JSON.parse(localStorage.getItem('stats_sessions') || "[]");
        if (historial.length === 0) return Toast.fire({ icon: 'info', title: 'No tienes sesiones guardadas' });

        let listaHTML = '<div class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scroll text-left">';
        historial.reverse().forEach((s) => {
            listaHTML += `
                <div class="flex justify-between items-center p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer border border-slate-200 dark:border-slate-600 group" onclick="Sesion.cargar(${s.id})">
                    <div>
                        <div class="font-bold text-sm text-slate-700 dark:text-white">${s.nombre}</div>
                        <div class="text-[10px] text-slate-400">${s.fecha} • ${s.config}</div>
                    </div>
                    <div class="flex gap-2">
                        <span class="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full group-hover:bg-orange-200">Cargar</span>
                        <button onclick="event.stopPropagation(); Sesion.eliminar(${s.id})" class="text-red-400 hover:text-red-600 px-2"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        listaHTML += '</div>';

        Swal.fire({
            title: 'Sesiones Guardadas',
            html: listaHTML,
            showConfirmButton: false,
            showCloseButton: true,
            width: '500px',
            customClass: { popup: 'rounded-2xl dark:bg-slate-800 dark:text-white' }
        });
    },

    // 3. Cargar (ACTUALIZADO CON MODO AUTOMÁTICO)
    cargar: (id) => {
        const historial = JSON.parse(localStorage.getItem('stats_sessions') || "[]");
        const s = historial.find(ses => ses.id === id);

        if (s) {
            document.getElementById('data-input').value = s.datos;
            document.getElementById('session-name').value = s.nombre;

            const radio = document.querySelector(`input[name="tipo-calculo"][value="${s.config}"]`);
            if (radio) {
                radio.checked = true;
                if (typeof actualizarEstiloToggle === 'function') actualizarEstiloToggle(radio);
            }

            toggleInput('manual');
            Swal.close();

            // AQUÍ: Enviamos 'true' para que NO pregunte y ejecute directo
            procesarDatos(true);
            Toast.fire({ icon: 'success', title: `Sesión "${s.nombre}" cargada` });
        }
    },

    // 4. Eliminar (SIN CAMBIOS)
    eliminar: (id) => {
        let historial = JSON.parse(localStorage.getItem('stats_sessions') || "[]");
        historial = historial.filter(s => s.id !== id);
        localStorage.setItem('stats_sessions', JSON.stringify(historial));

        Swal.close();
        setTimeout(() => Sesion.listar(), 100);
        Toast.fire({ icon: 'info', title: 'Sesión eliminada' });
    },

    // 5. Exportar (SIN CAMBIOS)
    exportar: () => {
        const nombre = document.getElementById('session-name').value.trim() || "sesion_estadistica";
        const datos = document.getElementById('data-input').value.trim();
        const tipoCalculo = document.querySelector('input[name="tipo-calculo"]:checked').value;

        if (!datos) return Toast.fire({ icon: 'warning', title: 'Nada para exportar' });

        const dataStr = JSON.stringify({ nombre, datos, config: tipoCalculo, tipo: 'UNIGUAJIRA_STATS_FILE' });
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `${nombre}.json`);
        linkElement.click();
    },

    // 6. Importar (ACTUALIZADO CON MODO AUTOMÁTICO)
    importar: (input) => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (json.tipo !== 'UNIGUAJIRA_STATS_FILE') throw new Error('Formato inválido');

                document.getElementById('data-input').value = json.datos;
                document.getElementById('session-name').value = json.nombre;

                const radio = document.querySelector(`input[name="tipo-calculo"][value="${json.config}"]`);
                if (radio) {
                    radio.checked = true;
                    if (typeof actualizarEstiloToggle === 'function') actualizarEstiloToggle(radio);
                }

                toggleInput('manual');

                // AQUÍ: Usamos setTimeout para asegurar que el DOM renderizó y enviamos 'true'
                setTimeout(() => {
                    procesarDatos(true);
                    Toast.fire({ icon: 'success', title: 'Archivo analizado' });
                }, 50);

            } catch (error) {
                Toast.fire({ icon: 'error', title: 'El archivo no es válido' });
            }
            input.value = '';
        };
        reader.readAsText(file);
    }
};
// --- GESTOR DE RENDIMIENTO ---

function togglePerformance() {
    const html = document.documentElement;
    const btn = document.getElementById('btn-perf');
    const isLowPerf = html.classList.toggle('low-perf');
    
    // Guardar preferencia
    localStorage.setItem('low-performance', isLowPerf);

    // Actualizar visual del botón
    if (isLowPerf) {
        btn.classList.add('btn-perf-active');
        Toast.fire({icon: 'info', title: 'Modo Bajo Rendimiento: ACTIVADO'});
    } else {
        btn.classList.remove('btn-perf-active');
        Toast.fire({icon: 'success', title: 'Modo Gráfico: ACTIVADO'});
    }

    // PAUSAR/REANUDAR VIDEOS (Ahorro real de CPU/GPU)
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
        if (isLowPerf) {
            v.pause();
        } else {
            // Solo reproducir si está visible según el tema actual
            const isDark = html.classList.contains('dark');
            // Lógica simple: intentar reproducir todos, el CSS los oculta visualmente
            // pero pausarlos evita que la CPU trabaje en segundo plano.
            v.play().catch(e => {}); 
        }
    });
}

// INICIAR ESTADO AL CARGAR (Poner esto al final del archivo o junto al init del Dark Mode)
document.addEventListener('DOMContentLoaded', () => {
    // ... (tu otro código) ...

    // Verificar preferencia guardada
    if (localStorage.getItem('low-performance') === 'true') {
        document.documentElement.classList.add('low-perf');
        document.getElementById('btn-perf')?.classList.add('btn-perf-active');
        
        // Pausar videos inmediatamente
        setTimeout(() => {
            document.querySelectorAll('video').forEach(v => v.pause());
        }, 100);
    }
});
// --- SOLUCIÓN: PREVENIR APERTURA DE PESTAÑA AL ARRASTRAR ---

const dropZone = document.getElementById('input-file-container');
const fileInput = document.getElementById('file-upload');

if (dropZone) {
    // 1. Prevenir comportamiento por defecto en todo el documento
    // (Para que si fallas al soltar y cae fuera, tampoco se abra)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // 2. Efectos visuales (Opcional: se ilumina cuando pasas el archivo por encima)
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('border-orange-500', 'bg-orange-50', 'dark:bg-white/10');
    }
    function unhighlight(e) {
        dropZone.classList.remove('border-orange-500', 'bg-orange-50', 'dark:bg-white/10');
    }

    // 3. Manejar la caída del archivo (DROP)
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            // Asignamos los archivos al input invisible para que tu función 'procesarArchivoUnificado' funcione
            fileInput.files = files;
            
            // Llamamos manualmente a tu función de procesamiento
            procesarArchivoUnificado(fileInput);
        }
    }
}
