// js/charts.js

let chartHistograma = null;
let chartPastel = null;
let chartBoxPlot = null;
function getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    
    return {
        // Si es Dark: Texto Gris Claro (#cbd5e1). Si es Claro: Texto Gris Oscuro (#334155)
        textColor: isDark ? '#cbd5e1' : '#334155', 
        
        // Si es Dark: Rejilla blanca transparente. Si es Claro: Rejilla negra transparente
        gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        
        // Fondo del tooltip (negro en dark, blanco en light)
        tooltipBg: isDark ? '#1f2937' : '#ffffff',
        
        // Borde del tooltip
        tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'
    };
}
// Función para reiniciar el lienzo (Evita errores de superposición)
function resetCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;

    const parent = canvas.parentNode;
    parent.removeChild(canvas);

    const newCanvas = document.createElement('canvas');
    newCanvas.setAttribute('id', id);
    parent.appendChild(newCanvas);
    return newCanvas;
}

function generarGraficos(tabla, datosRaw = []) {

    // --- 1. PREPARACIÓN DE DATOS (A PRUEBA DE FALLOS) ---
    // Convertimos explícitamente a String las etiquetas
    const labels = tabla.map(t => String(t.x));

    // Convertimos explícitamente a Número los valores (Esto arregla el error n.reduce)
    const dataFi = tabla.map(t => Number(t.fi));
    const dataPi = tabla.map(t => Number(t.pi));

    // Colores y estilos
    const colorPrincipal = 'rgba(249, 115, 22, 0.6)';
    const bordePrincipal = 'rgba(249, 115, 22, 1)';
    const paletaPastel = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const { textColor, gridColor } = getChartColors();
    // --- 2. HISTOGRAMA ---
    try {
        const canvas1 = resetCanvas('mainChart');
        if (canvas1) {
            chartHistograma = new Chart(canvas1.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Frecuencia Absoluta',
                        data: dataFi,
                        backgroundColor: colorPrincipal,
                        borderColor: bordePrincipal,
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        zoom: {
                            limits: {
                y: { min: 0 } // ¡Esto es el piso! Impide bajar de 0.
            },
                            pan: {
                                enabled: true, // Permite arrastrar (panear)
                                mode: 'xy'
                            },
                            zoom: {
                                wheel: {
                                    enabled: true, // Permite zoom con la rueda
                                },
                                pinch: {
                                    enabled: true // Permite pellizcar en móvil
                                },
                                mode: 'xy'
                            }
                        }
                    },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    } catch (e) { console.warn("Error Histograma:", e); }

// --- 3. GRÁFICO CIRCULAR (PASTEL) ---
    try {
        const canvas2 = resetCanvas('pieChart');
        if (canvas2) {
            // Asignamos colores cíclicos
            const backgroundColors = dataPi.map((_, i) => paletaPastel[i % paletaPastel.length]);

            chartPastel = new Chart(canvas2.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataPi,
                        backgroundColor: backgroundColors,
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Importante para que se estire bien
                    layout: {
                        padding: {
                            left: 0,
                            right: 20, // Un poco de aire a la derecha
                            top: 0,
                            bottom: 0
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'right', // <--- AQUÍ ESTÁ EL CAMBIO: Siempre a la derecha
                            align: 'center',   // Centrado verticalmente
                            labels: {
                                boxWidth: 12,
                                usePointStyle: true, // Usa circulitos en vez de rectángulos (se ve más limpio)
                                pointStyle: 'circle',
                                font: { size: 11 },  // Tamaño legible
                                padding: 15          // Espacio entre items
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return ` ${context.label}: ${context.parsed}%`;
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (e) { console.warn("Error Pastel:", e); }

    // --- 4. BOXPLOT (ALTURA COMPLETA DE CAJA, DISPERSIÓN PUNTOS) ---
    try {
        // Validación de datos
        if (!datosRaw || !Array.isArray(datosRaw) || datosRaw.length === 0) {
            console.warn("No hay datos crudos (datosRaw) para el boxplot.");

            // --- TU CORRECCIÓN (AÑADE ESTO) ---
            // Oculta el contenedor si no hay datos (caso cualitativo)
            const canvasBox = document.getElementById('boxPlotChart');
            if (canvasBox && canvasBox.parentNode) {
                canvasBox.parentNode.classList.add('hidden');
            }
            // --- FIN DE TU CORRECCIÓN ---

            return; // Detiene la ejecución del boxplot
        }
const canvasBox = resetCanvas('boxPlotChart');
    if (canvasBox) {

        // --- TU CORRECCIÓN 2 (AÑADE ESTO) ---
        // Asegúrate de que el contenedor es visible si SÍ hay datos
        if (canvasBox.parentNode) {
            canvasBox.parentNode.classList.remove('hidden');
        }
        // --- FIN DE TU CORRECCIÓN 2 ---

        const ctx3 = canvasBox.getContext('2d');
        // ...

            // --- 1. PREPARACIÓN DE DATOS (JITTER ADAPTABLE) ---

            const numDatos = datosRaw.length;
            const minJitter = 0.4; // Dispersión mínima para los puntos
            // Maximo Jitter para los puntos, para que no toquen los bordes extremos del -1.1 a 1.1
            const maxJitter = 0.9;
            const maxPointsForJitter = 60;

            const jitterRange = maxJitter - minJitter;
            const pointsRatio = Math.min(1.0, numDatos / maxPointsForJitter);
            // Este jitterFactor SOLO controla la dispersión de los puntos, NO la altura de la caja.
            const jitterFactor = minJitter + (pointsRatio * jitterRange);

            // Los puntos se dispersan dentro del rango vertical -1 a 1
            const scatterData = datosRaw.map(val => ({
                x: val,
                // Multiplicamos por el jitterFactor que es dinámico
                y: ((Math.random() * 2.0) - 1.0) * jitterFactor
            }));

            // Colores
            const boxColor = 'rgba(99, 102, 241, 0.5)';
            const boxBorder = 'rgba(99, 102, 241, 1)';
            const pointColor = '#ef4444';
            chartBoxPlot = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: [''],
                    datasets: [
                        // --- DATASET 1: LA CAJA Y BIGOTES ---
                        {
                            type: 'boxplot',
                            label: 'Caja y Bigotes',
                            data: [datosRaw],
                            backgroundColor: boxColor,
                            borderColor: boxBorder,
                            borderWidth: 2,
                            itemRadius: 0,
                            outlierColor: 'transparent',
                            padding: 10,
                            coef: Number.POSITIVE_INFINITY,

                            categoryPercentage: 6,
                            barPercentage: 0.8 // Esto mantiene la "anchura" visual de la caja
                        },
                        // --- DATASET 2: LOS PUNTOS DISPERSOS ---
                        {
                            type: 'scatter',
                            label: 'Puntos de Datos',

                            data: scatterData,
                            backgroundColor: pointColor,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',

                    scales: {
                        x: {
                            type: 'linear',
beginAtZero: false, // <--- Esto permite que el gráfico empiece donde empiezan tus datos
        grace: '10%',                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                        autoSkip: false, // 1. Fuerza a mostrar TODAS las etiquetas
                            maxRotation: 90, // 2. Rota las etiquetas si se amontonan
                            minRotation: 45
                        },
                        y: {
                            type: 'linear',
                            min: -1.1,
                            max: 1.1,
                            grid: { display: false, drawBorder: false },
                            ticks: { display: false },
                            title: {
                                display: true,
                                text: 'Distribución',
                                color: 'rgba(255, 255, 255, 0.7)',
                                font: { size: 12 }
                            }
                        }
                    },

                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: 'rgba(255, 255, 255, 0.7)' }
                        },

                        tooltip: {
                            callbacks: {
                                title: function () { return null; },

                                label: function (context) {
                                    const datasetLabel = context.dataset.label || '';

                                    if (context.dataset.type === 'boxplot') {
                                        const v = context.parsed;
                                        if (v && v.min !== undefined) {
                                            return `Min: ${v.min}, Q1: ${v.q1}, Mediana: ${v.median}, Q3: ${v.q3}, Max: ${v.max}`;
                                        }
                                    }

                                    if (context.dataset.type === 'scatter') {
                                        return `${datasetLabel}: ${context.parsed.x}`;
                                    }

                                    return '';
                                }
                            }
                        },
                    zoom: {
        pan: {
            enabled: true,   // Habilita arrastrar
            mode: 'x',       // Solo horizontal (porque tu gráfico es horizontal)
            threshold: 10    // Sensibilidad
        },
        zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
        }
    }
                    } // Cierre de plugins
                }
            });
        }
    } catch (e) {
        console.error("Error Boxplot (Altura Completa):", e);
    }
} function resetZoom(chartName) {

    // Si el gráfico de histograma existe Y tiene la función 'resetZoom'
    if (chartName === 'histograma' && chartHistograma && typeof chartHistograma.resetZoom === 'function') {
        chartHistograma.resetZoom();
    }

    // Si el gráfico de caja existe Y tiene la función 'resetZoom'
    else if (chartName === 'boxplot' && chartBoxPlot && typeof chartBoxPlot.resetZoom === 'function') {
        chartBoxPlot.resetZoom(); // Esto ahora SÍ debería funcionar
    }
}function actualizarColoresGraficos() {
    const { textColor, gridColor, tooltipBg, tooltipBorder } = getChartColors();
    
    const charts = [chartHistograma, chartPastel, chartBoxPlot];
    
    charts.forEach(chart => {
        if (chart) {
            // Actualizar Leyendas
            if (chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }

            // Actualizar Tooltips
            if (chart.options.plugins.tooltip) {
                chart.options.plugins.tooltip.titleColor = textColor;
                chart.options.plugins.tooltip.bodyColor = textColor;
                chart.options.plugins.tooltip.backgroundColor = tooltipBg;
                chart.options.plugins.tooltip.borderColor = tooltipBorder;
                // En modo claro, el borde debe ser más visible
                chart.options.plugins.tooltip.borderWidth = 1; 
            }

            // Actualizar Escalas (Ejes X e Y)
            if (chart.options.scales) {
                ['x', 'y'].forEach(axis => {
                    if (chart.options.scales[axis]) {
                        // Color de los numeritos (ticks)
                        if (chart.options.scales[axis].ticks) {
                            chart.options.scales[axis].ticks.color = textColor;
                        }
                        // Color de las líneas de fondo (grid)
                        if (chart.options.scales[axis].grid) {
                            chart.options.scales[axis].grid.color = gridColor;
                        }
                        // Color del título del eje
                        if (chart.options.scales[axis].title) {
                            chart.options.scales[axis].title.color = textColor;
                        }
                    }
                });
            }
            
            chart.update(); // Quitamos 'none' para que anime el cambio de color suavemente
        }
    });
}