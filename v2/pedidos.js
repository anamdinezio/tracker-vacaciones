// Pedidos de vacaciones: cada persona recibe la plantilla en blanco, completa sus datos
// y se la devuelve al jefe, que sube uno o varios archivos juntos.
// Plantilla de una persona: títulos en la fila 1, nombre y mail en la fila 2,
// y debajo de los títulos "Desde" y "Hasta" una fila por período.
// También se acepta una fila por período con las cuatro columnas: nombre, mail, desde, hasta.
// A cada persona se la reconoce por el mail (o por el nombre si no tiene mail).
// Si no está en el equipo, se agrega.
// Usa las funciones de importar.js (leer el archivo y entender las fechas) y los datos de app.js.

// Resultado de la última carga, para mostrarlo (y traducirlo si cambia el idioma).
let resultadoPedidos = null;

// Busca a la persona del pedido en el equipo. Si no está, la agrega y lo anota en "nuevas".
function buscarOAgregarPersona(nombre, mail, nuevas) {
  const mailBuscado = mail.toLowerCase();
  const nombreBuscado = nombre.toLowerCase();
  let empleado = datos.empleados.find((otro) =>
    mailBuscado ? otro.mail.toLowerCase() === mailBuscado : otro.nombre.toLowerCase() === nombreBuscado
  );
  if (empleado) return empleado;

  // Si el equipo tiene una sola persona sin completar (la de inicio), se usa esa en lugar de agregar otra.
  const vacia = datos.empleados.length === 1 && !datos.empleados[0].nombre && !datos.empleados[0].mail;
  empleado = vacia ? datos.empleados[0] : empleadoVacio();
  empleado.nombre = nombre;
  empleado.mail = mail;
  if (!vacia) datos.empleados.push(empleado);
  nuevas.add(empleado);
  return empleado;
}

// Mismas reglas que al cargar un período a mano. Devuelve la clave del error, o "".
function validarPedido(empleado, periodo) {
  const { desde, hasta } = periodo;
  if (hasta < desde) return "errorPeriodoOrden";
  if (!desde.startsWith(datos.anio + "-") || !hasta.startsWith(datos.anio + "-")) return "errorPeriodoFueraDelAnio";
  const { inicioContrato, finContrato } = empleado;
  if ((inicioContrato && desde < inicioContrato) || (finContrato && hasta > finContrato)) {
    return "errorPeriodoFueraDelContrato";
  }
  const sePisa = empleado.periodos.some((otro) => desde <= otro.hasta && hasta >= otro.desde);
  if (sePisa) return "errorPeriodoSolapado";
  return "";
}

// Textos de ejemplo de la plantilla: si nadie los cambió, se ignoran.
function esTextoDeEjemplo(texto) {
  const ejemplos = ["es", "en"].flatMap((clave) => [
    TEXTOS[clave].nombre,
    TEXTOS[clave].ejemploMail,
    TEXTOS[clave].ejemploFecha,
  ]);
  return ejemplos.some((ejemplo) => ejemplo.toLowerCase() === texto.toLowerCase());
}

function limpiar(celda) {
  const texto = String(celda ?? "").trim();
  return esTextoDeEjemplo(texto) ? "" : texto;
}

// ¿El texto de la celda es igual a ese título en algún idioma? (por ejemplo "Desde" o "From")
function esTitulo(celda, clave) {
  const texto = String(celda ?? "").trim().toLowerCase();
  return [TEXTOS.es[clave], TEXTOS.en[clave]].some((titulo) => titulo.toLowerCase() === texto);
}

// En la plantilla de una persona, la fila con el título "Desde" en la primera columna.
// Devuelve su posición, o -1 si el archivo no tiene esa forma.
function filaDeTituloDesde(filas) {
  return filas.findIndex((fila) => esTitulo(fila[0], "desde"));
}

function esPlantillaDePersona(filas) {
  return filaDeTituloDesde(filas) > 0;
}

// Nombre en A2 y mail en B2. Debajo del título "Desde", una fila por período (desde en A, hasta en B).
// También se entiende la forma con los títulos a la izquierda: "Mail" en A2, nombre en B1 y mail en B2.
function leerPlantillaDePersona(filas) {
  const titulosALaIzquierda = esTitulo(filas[1]?.[0], "mail");
  const nombre = limpiar(titulosALaIzquierda ? filas[0]?.[1] : filas[1]?.[0]);
  const mail = limpiar(filas[1]?.[1]);
  const empiezaEn = filaDeTituloDesde(filas) + 1;
  return filas.slice(empiezaEn).map((fila, i) => ({
    numeroDeFila: i + empiezaEn + 1, // como se ve en Excel
    nombre,
    mail,
    textoDesde: limpiar(fila[0]),
    textoHasta: limpiar(fila[1]),
  }));
}

// Una fila por período: nombre, mail, desde, hasta. Si la primera fila es el encabezado, se saltea.
function leerUnaFilaPorPeriodo(filas) {
  const empiezaEn = filas.length && !partesDeFecha(String(filas[0][2] ?? "")) ? 1 : 0;
  return filas.slice(empiezaEn).map((fila, i) => ({
    numeroDeFila: i + empiezaEn + 1,
    nombre: limpiar(fila[0]),
    mail: limpiar(fila[1]),
    textoDesde: limpiar(fila[2]),
    textoHasta: limpiar(fila[3]),
  }));
}

// Lee un archivo y carga sus filas. Suma lo que pasó en "resultado".
async function cargarArchivoDePedidos(archivo, resultado, nuevas) {
  let filas;
  try {
    const esExcel = /\.(xlsx|xls)$/i.test(archivo.name);
    filas = esExcel ? await leerExcel(archivo) : leerCsv(await archivo.text());
  } catch (error) {
    resultado.errores.push({ archivo: archivo.name, fila: 0, clave: "errorImportarArchivo", valor: "" });
    return;
  }

  const pedidos = esPlantillaDePersona(filas) ? leerPlantillaDePersona(filas) : leerUnaFilaPorPeriodo(filas);
  const orden = ordenDelArchivo(pedidos.flatMap((pedido) => [pedido.textoDesde, pedido.textoHasta]));

  // Si el archivo no tiene ninguna fila con fechas, se avisa en lugar de no hacer nada.
  if (!pedidos.some((pedido) => pedido.textoDesde || pedido.textoHasta)) {
    resultado.errores.push({ archivo: archivo.name, fila: 0, clave: "errorPedidoSinFechas", valor: "" });
    return;
  }

  pedidos.forEach(({ numeroDeFila, nombre, mail, textoDesde, textoHasta }) => {
    if (!textoDesde && !textoHasta) return; // fila sin fechas

    const anotarError = (clave, valor) =>
      resultado.errores.push({ archivo: archivo.name, fila: numeroDeFila, clave, valor });

    if (!nombre && !mail) return anotarError("errorPedidoSinPersona", "");
    if (mail && !/^\S+@\S+\.\S+$/.test(mail)) return anotarError("errorMail", mail);
    if (!textoDesde || !textoHasta) return anotarError("errorPeriodoIncompleto", textoDesde || textoHasta);

    const desde = entenderFecha(textoDesde, orden);
    if (desde.error) return anotarError(desde.error, textoDesde);
    const hasta = entenderFecha(textoHasta, orden);
    if (hasta.error) return anotarError(hasta.error, textoHasta);

    const empleado = buscarOAgregarPersona(nombre, mail, nuevas);
    const periodo = { desde: desde.fecha, hasta: hasta.fecha };

    // Si el mismo período ya estaba cargado (por ejemplo, al subir dos veces el archivo), no es un error.
    if (empleado.periodos.some((otro) => otro.desde === periodo.desde && otro.hasta === periodo.hasta)) {
      resultado.repetidos++;
      return;
    }

    const error = validarPedido(empleado, periodo);
    if (error) return anotarError(error, textoDesde + " - " + textoHasta);

    empleado.periodos.push(periodo);
    empleado.periodos.sort((a, b) => a.desde.localeCompare(b.desde));
    const nombreVisible = empleado.nombre || empleado.mail;
    resultado.porPersona[nombreVisible] = (resultado.porPersona[nombreVisible] || 0) + 1;
  });
}

async function cargarPedidos(archivos) {
  const resultado = { porPersona: {}, nuevas: [], repetidos: 0, errores: [] };
  const nuevas = new Set();
  for (const archivo of archivos) await cargarArchivoDePedidos(archivo, resultado, nuevas);

  resultado.nuevas = [...nuevas].map((empleado) => empleado.nombre || empleado.mail);
  guardarDatos();
  resultadoPedidos = resultado;
  actualizarPantalla();
  mostrarResultadoPedidos();
}

function mostrarResultadoPedidos() {
  const caja = document.getElementById("resultado-pedidos");
  caja.innerHTML = "";
  if (!resultadoPedidos) return;

  const textos = TEXTOS[idioma];
  const { porPersona, nuevas, repetidos, errores } = resultadoPedidos;
  const nombres = Object.keys(porPersona);

  if (nombres.length) {
    const lista = crearElemento("ul", "lista-pedidos");
    nombres.forEach((nombre) => {
      const plantilla = porPersona[nombre] === 1 ? textos.pedidosDePersonaUno : textos.pedidosDePersona;
      let texto = plantilla.replace("{nombre}", nombre).replace("{n}", porPersona[nombre]);
      if (nuevas.includes(nombre)) texto += " " + textos.personaNueva;
      lista.append(crearElemento("li", "", texto));
    });
    const exito = crearElemento("div", "exito");
    exito.append(lista);
    caja.append(exito);
  } else if (!errores.length) {
    caja.append(crearElemento("p", "aviso", textos.pedidosSinCambios));
  }

  if (repetidos) {
    const texto = repetidos === 1 ? textos.pedidosRepetidoUno : textos.pedidosRepetidos.replace("{n}", repetidos);
    caja.append(crearElemento("p", "aclaracion", texto));
  }
  if (nuevas.length) caja.append(crearElemento("p", "aviso", textos.completarPersonasNuevas));

  if (errores.length) {
    const titulo = errores.length === 1 ? textos.pedidosConUnError : textos.pedidosConErrores;
    const detalles = errores.map((error) => {
      const donde = error.fila ? error.archivo + ", " + textos.filaN.replace("{n}", error.fila) : error.archivo;
      const valor = error.valor ? " (" + error.valor + ")" : "";
      return donde + valor + ": " + textos[error.clave];
    });
    caja.append(crearCajaDeErrores(titulo.replace("{n}", errores.length), detalles));
  }
}

// ---------- Plantilla ----------

// Excel en blanco para pasarle a cada persona: nombre y mail una vez, y debajo sus fechas.
async function descargarPlantillaPedidos() {
  const textos = TEXTOS[idioma];

  try {
    await cargarLibreriaExcel();
  } catch (error) {
    document.getElementById("resultado-pedidos").replaceChildren(
      crearElemento("p", "error", textos.errorLibreriaExcel)
    );
    return;
  }

  const filas = [
    [textos.nombre, textos.mail],
    [textos.nombre, textos.ejemploMail],
    [],
    [textos.desde, textos.hasta],
    [textos.ejemploFecha, textos.ejemploFecha],
  ];
  const hoja = XLSX.utils.aoa_to_sheet(filas);

  // Debajo del ejemplo, 20 filas vacías con formato de fecha, para que Excel guarde lo que se escriba como fecha.
  const formato = idioma === "es" ? "dd/mm/yyyy" : "yyyy-mm-dd";
  for (let fila = 6; fila <= 25; fila++) {
    hoja["A" + fila] = { t: "z", z: formato };
    hoja["B" + fila] = { t: "z", z: formato };
  }
  hoja["!ref"] = "A1:B25";
  hoja["!cols"] = [{ wch: 22 }, { wch: 30 }]; // ancho de las columnas

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, textos.hojaPedidos);
  XLSX.writeFile(libro, textos.nombrePlantillaPedidos + ".xlsx", { sheetStubs: true });
}

// ---------- Botones ----------

const entradaPedidos = document.getElementById("archivo-pedidos");

document.getElementById("boton-cargar-pedidos").addEventListener("click", () => entradaPedidos.click());
document.getElementById("boton-plantilla-pedidos").addEventListener("click", descargarPlantillaPedidos);
entradaPedidos.addEventListener("change", async () => {
  if (entradaPedidos.files.length) await cargarPedidos([...entradaPedidos.files]);
  entradaPedidos.value = ""; // para poder volver a elegir los mismos archivos
});
