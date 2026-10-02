// Importar festivos desde un archivo CSV o Excel, y descargarlos en Excel.
// Columnas: la primera es la fecha y la segunda el nombre (opcional).
// Usa las funciones y los datos de app.js (se llaman cuando la página ya cargó todo).

// Librería para leer Excel. Se descarga solo la primera vez que alguien importa un .xlsx.
const URL_LIBRERIA_EXCEL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

function cargarLibreriaExcel() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((resolver, rechazar) => {
    const script = document.createElement("script");
    script.src = URL_LIBRERIA_EXCEL;
    script.onload = resolver;
    script.onerror = rechazar;
    document.head.append(script);
  });
}

// ---------- Leer el archivo y convertirlo en filas ----------

// Divide una línea de CSV respetando las comillas ("Día de la Madre, Argentina").
function dividirLineaCsv(linea, separador) {
  const celdas = [];
  let actual = "";
  let entreComillas = false;

  for (const caracter of linea) {
    if (caracter === '"') {
      entreComillas = !entreComillas;
    } else if (caracter === separador && !entreComillas) {
      celdas.push(actual);
      actual = "";
    } else {
      actual += caracter;
    }
  }
  celdas.push(actual);
  return celdas.map((celda) => celda.trim());
}

// El Excel en español guarda los CSV con ";" y el de inglés con ",".
function leerCsv(texto) {
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter((linea) => linea.trim() !== "");
  const separador = lineas.length && lineas[0].includes(";") ? ";" : ",";
  return lineas.map((linea) => dividirLineaCsv(linea, separador));
}

// En Excel las fechas son números (días desde 1900); los pasamos a "aaaa-mm-dd".
async function leerExcel(archivo) {
  await cargarLibreriaExcel();
  const libro = XLSX.read(await archivo.arrayBuffer());
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: "" });

  return filas.map((fila) =>
    fila.map((celda) => {
      if (typeof celda === "number") {
        const fecha = XLSX.SSF.parse_date_code(celda);
        return fecha.y + "-" + String(fecha.m).padStart(2, "0") + "-" + String(fecha.d).padStart(2, "0");
      }
      return String(celda).trim();
    })
  );
}

// ---------- Entender las fechas ----------

// Arma "aaaa-mm-dd" solo si la fecha existe (por ejemplo, no hay 31 de febrero).
function armarFecha(anio, mes, dia) {
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return "";
  return fechaATexto(fecha);
}

// Separa una fecha escrita en partes. Acepta "2026-12-25", "25/12/2026", "25-12-2026" y "25.12.2026".
function partesDeFecha(texto) {
  let partes = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (partes) return { tipo: "iso", anio: +partes[1], mes: +partes[2], dia: +partes[3] };

  partes = texto.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (partes) return { tipo: "barras", primero: +partes[1], segundo: +partes[2], anio: +partes[3] };

  return null;
}

// "03/08/2026" puede ser 3 de agosto (día primero) o 8 de marzo (mes primero).
// Si alguna fecha del archivo tiene un número mayor a 12, eso define el orden de todo el archivo.
// Si no, en español se toma día primero; en inglés no se adivina y se avisa.
function ordenDelArchivo(fechasEscritas) {
  for (const texto of fechasEscritas) {
    const partes = partesDeFecha(texto);
    if (partes && partes.tipo === "barras") {
      if (partes.primero > 12) return "diaPrimero";
      if (partes.segundo > 12) return "mesPrimero";
    }
  }
  return idioma === "es" ? "diaPrimero" : "";
}

// Devuelve { fecha } si se entendió, o { error } con la clave del texto de error.
function entenderFecha(texto, orden) {
  const partes = partesDeFecha(texto);
  if (!partes) return { error: "errorImportarFecha" };

  if (partes.tipo === "iso") {
    const fecha = armarFecha(partes.anio, partes.mes, partes.dia);
    return fecha ? { fecha } : { error: "errorImportarFecha" };
  }

  const ambigua = partes.primero <= 12 && partes.segundo <= 12;
  if (ambigua && !orden) return { error: "errorImportarAmbigua" };

  const diaPrimero = orden === "diaPrimero" || partes.primero > 12;
  const dia = diaPrimero ? partes.primero : partes.segundo;
  const mes = diaPrimero ? partes.segundo : partes.primero;
  const fecha = armarFecha(partes.anio, mes, dia);
  return fecha ? { fecha } : { error: "errorImportarFecha" };
}

// ---------- Importar ----------

// Resultado de la última importación, para mostrarlo (y traducirlo si cambia el idioma).
let resultadoImportacion = null;

async function importarFestivos(archivo) {
  let filas;
  try {
    const esExcel = /\.(xlsx|xls)$/i.test(archivo.name);
    filas = esExcel ? await leerExcel(archivo) : leerCsv(await archivo.text());
  } catch (error) {
    resultadoImportacion = { cargados: 0, actualizados: 0, errores: [], errorGeneral: "errorImportarArchivo" };
    mostrarResultadoImportacion();
    return;
  }

  // Si la primera fila es el encabezado ("fecha", "nombre"), se saltea.
  const empiezaEn = filas.length && !partesDeFecha(filas[0][0] || "") ? 1 : 0;
  const orden = ordenDelArchivo(filas.slice(empiezaEn).map((fila) => fila[0] || ""));

  let cargados = 0;
  let actualizados = 0;
  const errores = [];

  filas.slice(empiezaEn).forEach((fila, i) => {
    const numeroDeFila = i + empiezaEn + 1; // como se ve en Excel
    const texto = fila[0] || "";
    if (!texto && !fila[1]) return; // fila vacía

    const { fecha, error } = entenderFecha(texto, orden);
    if (error) {
      errores.push({ fila: numeroDeFila, clave: error, valor: texto });
      return;
    }

    const festivo = { fecha, nombre: (fila[1] || "").trim() };

    // Si la fecha ya estaba cargada (por ejemplo, al volver a subir el Excel descargado),
    // no es un error: se actualiza el nombre si cambió.
    const existente = datos.festivos.find((otro) => otro.fecha === fecha);
    if (existente) {
      if (festivo.nombre && festivo.nombre !== existente.nombre) {
        existente.nombre = festivo.nombre;
        actualizados++;
      }
      return;
    }

    // Mismas reglas que al cargar un festivo a mano.
    festivoEditando = -1;
    const errorFestivo = validarFestivo(festivo);
    if (errorFestivo) {
      errores.push({ fila: numeroDeFila, clave: errorFestivo, valor: texto });
      return;
    }

    datos.festivos.push(festivo);
    cargados++;
  });

  datos.festivos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (cargados > 0 || actualizados > 0) guardarDatos();

  resultadoImportacion = { cargados, actualizados, errores, errorGeneral: "" };
  cancelarEdicionFestivo(); // limpia el formulario y vuelve a dibujar todo
  mostrarResultadoImportacion();
}

function mostrarResultadoImportacion() {
  const caja = document.getElementById("resultado-importacion");
  caja.innerHTML = "";
  if (!resultadoImportacion) return;

  const textos = TEXTOS[idioma];
  const { cargados, actualizados, errores, errorGeneral } = resultadoImportacion;

  if (errorGeneral) {
    caja.append(crearElemento("p", "error", textos[errorGeneral]));
    return;
  }

  let mensaje = cargados === 1 ? textos.importadosUnoOk : textos.importadosOk.replace("{n}", cargados);
  if (actualizados === 1) mensaje += " " + textos.importadosUnoActualizado;
  if (actualizados > 1) mensaje += " " + textos.importadosActualizados.replace("{n}", actualizados);
  caja.append(crearElemento("p", "aclaracion", mensaje));

  if (errores.length) {
    const titulo = errores.length === 1 ? textos.importadosConUnError : textos.importadosConErrores;
    caja.append(crearElemento("p", "error", titulo.replace("{n}", errores.length)));
    const lista = crearElemento("ul", "lista-errores");
    errores.forEach((error) => {
      const detalle = textos.filaN.replace("{n}", error.fila) + " (" + error.valor + "): " + textos[error.clave];
      lista.append(crearElemento("li", "", detalle));
    });
    caja.append(lista);
  }
}

// ---------- Descargar ----------

// Descarga un Excel con los festivos cargados, para editarlos y volver a subirlos.
// Si todavía no hay festivos, trae un ejemplo.
// Es .xlsx y no CSV porque así no importa si la computadora usa coma o punto y coma.
async function descargarPlantilla() {
  const textos = TEXTOS[idioma];
  const anio = datos.empleado.anio || new Date().getFullYear();

  try {
    await cargarLibreriaExcel();
  } catch (error) {
    resultadoImportacion = { cargados: 0, actualizados: 0, errores: [], errorGeneral: "errorLibreriaExcel" };
    mostrarResultadoImportacion();
    return;
  }

  const festivos = datos.festivos.length
    ? datos.festivos
    : [{ fecha: anio + "-12-25", nombre: textos.ejemploFestivo }];

  // Las fechas van como fechas de verdad, así Excel no las confunde con texto.
  const filas = [[textos.fecha, textos.nombreFestivo]];
  festivos.forEach((festivo) => filas.push([leerFecha(festivo.fecha), festivo.nombre]));

  const hoja = XLSX.utils.aoa_to_sheet(filas, { cellDates: true });
  const formato = idioma === "es" ? "dd/mm/yyyy" : "yyyy-mm-dd";
  for (let fila = 2; fila <= filas.length; fila++) hoja["A" + fila].z = formato;
  hoja["!cols"] = [{ wch: 14 }, { wch: 30 }]; // ancho de las columnas

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, textos.festivos);
  XLSX.writeFile(libro, textos.nombrePlantilla + ".xlsx");
}

// ---------- Botones ----------

const entradaArchivo = document.getElementById("archivo-festivos");

document.getElementById("boton-importar").addEventListener("click", () => entradaArchivo.click());
document.getElementById("boton-plantilla").addEventListener("click", descargarPlantilla);
entradaArchivo.addEventListener("change", async () => {
  if (entradaArchivo.files.length) await importarFestivos(entradaArchivo.files[0]);
  entradaArchivo.value = ""; // para poder volver a elegir el mismo archivo
});
