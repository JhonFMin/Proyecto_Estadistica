// Reemplaza TODO tu statistics.js con esto
const Estadistica = {
    esNumero: (valor) => !isNaN(parseFloat(valor)) && isFinite(valor),

    // --- FUNCIONES DE CÁLCULO (Devuelven NÚMEROS) ---
    media: (datos) => {
        const suma = datos.reduce((acc, val) => acc + val, 0);
        return (suma / datos.length); // Devuelve número para cálculos
    },

    mediana: (datos) => {
        const ordenados = [...datos].sort((a, b) => a - b);
        const mid = Math.floor(ordenados.length / 2);
        if (ordenados.length % 2 !== 0) return ordenados[mid];
        return (ordenados[mid - 1] + ordenados[mid]) / 2;
    },

    rango: (datos) => {
        const max = Math.max(...datos);
        const min = Math.min(...datos);
        return (max - min);
    },

    // Modificamos para aceptar el parámetro 'esPoblacion'
    varianza: (datos, media, esPoblacion = false) => {
        if (datos.length < 2) return 0;

        const sum = datos.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);

        // LA MAGIA ESTÁ AQUÍ:
        // Si es población, dividimos por N (datos.length)
        // Si es muestra, dividimos por n-1 (datos.length - 1)
        const divisor = esPoblacion ? datos.length : datos.length - 1;

        return (sum / divisor);
    },

    desviacion: (varianza) => Math.sqrt(varianza),

    // --- FUNCIÓN DE MODA (La que sí funciona) ---
    moda: (datos, tipoDato = 'cuantitativo') => {
        const frecuencia = {};
        datos.forEach(val => frecuencia[val] = (frecuencia[val] || 0) + 1);

        const frecArray = Object.entries(frecuencia).map(([val, frec]) => ({
            valor: val,
            frecuencia: frec
        }));

        if (frecArray.length === 0) {
            return { tipo: 'amodal', valor: 'N/A', modas: [], frecuencia: 0 };
        }

        frecArray.sort((a, b) => b.frecuencia - a.frecuencia);

        const maxFrec = frecArray[0].frecuencia;

        if (maxFrec === 1 && frecArray.length === datos.length) {
            return { tipo: 'amodal', valor: 'Amodal', modas: [], frecuencia: 1 };
        }

        const modas = frecArray
            .filter(item => item.frecuencia === maxFrec)
            .map(item => tipoDato === 'cuantitativo' ? Number(item.valor) : item.valor);

        if (tipoDato === 'cuantitativo') {
            modas.sort((a, b) => a - b);
        }

        if (modas.length === frecArray.length) {
            return { tipo: 'amodal', valor: 'Amodal', modas: [], frecuencia: maxFrec };
        }

        if (modas.length === 1) {
            return { tipo: 'unimodal', valor: String(modas[0]), modas: modas, frecuencia: maxFrec };
        }

        if (modas.length > 3) {
            return { tipo: 'multimodal', valor: 'Multimodal', modas: modas, frecuencia: maxFrec };
        }

        return { tipo: 'multimodal', valor: modas.join(', '), modas: modas, frecuencia: maxFrec };
    },

    // --- NUEVA DETECCIÓN ORDINAL (CON MÁS CASOS) ---
    analisisOrdinal: (datosTexto) => {
        const datosLimp = datosTexto.map(d => d.toLowerCase().trim());
        const datosUnicos = [...new Set(datosLimp)];

        // Lista expandida de escalas ordinales conocidas.
        // El orden DENTRO de cada array es crucial.
        const escalasConocidas = [
            // Calidad / Satisfacción (5-pt)
            ['pesimo', 'malo', 'regular', 'bueno', 'excelente'],
            ['muy insatisfecho', 'insatisfecho', 'neutral', 'satisfecho', 'muy satisfecho'],
            ['totalmente en desacuerdo', 'en desacuerdo', 'neutral', 'de acuerdo', 'totalmente de acuerdo'],
            // Calidad (3-pt)
            ['malo', 'regular', 'bueno'],
            ['bajo', 'medio', 'alto'],
            // Frecuencia
            ['nunca', 'rara vez', 'a veces', 'frecuentemente', 'siempre'],
            ['nunca', 'casi nunca', 'ocasionalmente', 'casi siempre', 'siempre'],
            // Tallas
            ['xs', 's', 'm', 'l', 'xl', 'xxl'],
            // Nivel Educativo
            ['ninguno', 'primaria', 'secundaria', 'tecnico', 'tecnologo', 'pregrado', 'posgrado', 'especializacion', 'maestria', 'doctorado'],
            // Estratos (simplificado)
            ['estrato 1', 'estrato 2', 'estrato 3', 'estrato 4', 'estrato 5', 'estrato 6'],
            // Notas (conceptual)
            ['deficiente', 'insuficiente', 'aceptable', 'sobresaliente', 'excelente']
        ];

        let escalaEncontrada = null;

        // Intentar encontrar una escala que contenga TODOS los datos únicos
        for (const escala of escalasConocidas) {
            const todosPertenecen = datosUnicos.every(dato => escala.includes(dato));
            // Asegurarse de que hay al menos 2 categorías diferentes presentes
            if (todosPertenecen && datosUnicos.length > 1) {
                escalaEncontrada = escala;
                break;
            }
        }

        if (!escalaEncontrada) {
            return null; // No se pudo identificar como ordinal (es nominal)
        }

        // Si se encontró, calcular la mediana ordinal
        const datosNumericos = datosLimp.map(val => escalaEncontrada.indexOf(val));
        datosNumericos.sort((a, b) => a - b);

        const mid = Math.floor(datosNumericos.length / 2);
        let indiceMediana;

        if (datosNumericos.length % 2 !== 0) {
            indiceMediana = datosNumericos[mid];
        } else {
            // Para datos pares, se toma la posición 'mid' (la superior)
            indiceMediana = datosNumericos[mid];
        }

        const palabraMediana = escalaEncontrada[indiceMediana];

        // Devolver un objeto para que main.js sepa qué hacer
        return {
            tipo: 'Ordinal',
            mediana: palabraMediana.charAt(0).toUpperCase() + palabraMediana.slice(1) // Capitalizado
        };
    },

    // --- OTRAS FUNCIONES ---
    tablaFrecuencias: (datos, esCuantitativa) => {
        const n = datos.length;
        const map = {};
        datos.forEach(x => map[x] = (map[x] || 0) + 1);

        let unicos = Object.keys(map);
        if (esCuantitativa) {
            unicos = unicos.map(Number).sort((a, b) => a - b);
        } else {
            unicos = unicos.sort((a, b) => map[b] - map[a]);
        }

        let Fi = 0;
        let tabla = [];
        unicos.forEach(x => {
            let fi = map[x];
            Fi += fi;
            let hi = (fi / n).toFixed(4);

            // CAMBIO AQUÍ: De toFixed(1) a toFixed(2)
            // Esto permite ver 0.64% en lugar de 0.6%
            let pi = (hi * 100).toFixed(2);

            tabla.push({ x, fi, Fi, hi, pi });
        });
        return tabla;
    },
generarPasoPaso: (tipo, datos, resultado, extra = null, esPoblacion = false) => {
        
        // CORRECCIÓN AQUÍ:
        // Permitimos pasar si hay datos O si el tipo es 'cv' (porque el CV no usa el array de datos)
        if ((!datos || datos.length === 0) && tipo !== 'cv') {
            if (tipo === 'desviacion') {
                return `$$ s = \\sqrt{${extra}} = ${resultado} $$`;
            }
            return `No hay datos para el paso a paso.`;
        }

        const n = datos ? datos.length : 0; // Evitamos error si datos es null

        switch(tipo) {
            // ... (otros casos: media, rango, etc) ...

            case 'varianza':
                const mediaVar = extra;
                // Limitamos a mostrar máx 6 términos para no saturar la pantalla si hay muchos datos
                const datosMuestra = datos.slice(0, 6);
                let terminos = datosMuestra.map(d => `(${d} - ${mediaVar})^2`).join(" + ");
                if (datos.length > 6) terminos += " + ...";

                // AQUÍ ESTÁ LA LÓGICA VISUAL:
                // Si es población muestra N, si es muestra muestra n-1
                const denom = esPoblacion ? n : `${n} - 1`;

                return `$$ s^2 = \\frac{${terminos}}{${denom}} = ${resultado} $$`;
            case 'desviacion':
                return `$$ s = \\sqrt{${extra}} = ${resultado} $$`;
            case 'mediana':
                const rawStr = datos.length > 10 ? datos.slice(0, 10).join(", ") + "..." : datos.join(", ");
                const ordenados = [...datos].sort((a, b) => a - b);
                const mid = Math.floor(ordenados.length / 2);
                let listaVisual = "";
                if (ordenados.length % 2 !== 0) {
                    listaVisual = ordenados.map((num, i) => i === mid ? `\\overset{\\downarrow}{\\mathbf{\\color{orange}{${num}}}}` : num).join(", ");
                } else {
                    listaVisual = ordenados.map((num, i) => (i === mid - 1 || i === mid) ? `\\mathbf{\\color{orange}{${num}}}` : num).join(", ");
                    listaVisual += ` \\rightarrow \\frac{${ordenados[mid - 1]} + ${ordenados[mid]}}{2}`;
                }
                return `$$ \\text{1. Desordenados: } [${rawStr}] $$ $$ \\text{2. Ordenados: } [${listaVisual}] = ${resultado} $$`;
            case 'moda':
                const conteo = {};
                datos.forEach(x => conteo[x] = (conteo[x] || 0) + 1);
                let maxFrec = 0;
                for (let k in conteo) if (conteo[k] > maxFrec) maxFrec = conteo[k];
                let textoConteo = Object.entries(conteo).map(([num, cant]) =>
                    (cant === maxFrec && cant > 1) ? `\\mathbf{\\color{orange}{${num}(${cant})}}` : `${num}(${cant})`).join(", ");
                return `$$ \\text{Frecuencias: } [${textoConteo}] \\rightarrow \\text{Mayor} = ${resultado} $$`;
            case 'cv':
                // En 'extra' vienen la desviación y la media que enviamos desde main.js
                const { desv, media } = extra;

                // Mostramos la división paso a paso
                return `$$ CV = \\frac{${desv}}{${media}} \\times 100 = ${resultado}\\% $$`;
            default: return "";
        }
    }
};
