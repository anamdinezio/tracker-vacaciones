// Pedidos de vacaciones: cada persona completa una plantilla de Excel y se la manda al jefe,
// que sube uno o varios archivos juntos. Columnas: nombre, mail, desde, hasta.
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

  // Si la primera fila es el encabezado (nombre, mail, desde, hasta), se saltea.
  const empiezaEn = filas.length && !partesDeFecha(filas[0][2] || "") ? 1 : 0;
  const fechasEscritas = filas.slice(empiezaEn).flatMap((fila) => [fila[2] || "", fila[3] || ""]);
  const orden = ordenDelArchivo(fechasEscritas);

  filas.slice(empiezaEn).forEach((fila, i) => {
    const numeroDeFila = i + empiezaEn + 1; // como se ve en Excel
    const [nombre = "", mail = "", textoDesde = "", textoHasta = ""] = fila.map((celda) => String(celda).trim());
    if (!nombre && !mail && !textoDesde && !textoHasta) return; // fila vacía

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
    caja.append(lista);
  } else if (!errores.length) {
    caja.append(crearElemento("p", "aclaracion", textos.pedidosSinCambios));
  }

  if (repetidos) caja.append(crearElemento("p", "aclaracion", textos.pedidosRepetidos.replace("{n}", repetidos)));
  if (nuevas.length) caja.append(crearElemento("p", "aclaracion", textos.completarPersonasNuevas));

  if (errores.length) {
    const titulo = errores.length === 1 ? textos.importadosConUnError : textos.importadosConErrores;
    caja.append(crearElemento("p", "error", titulo.replace("{n}", errores.length)));
    const lista = crearElemento("ul", "lista-errores");
    errores.forEach((error) => {
      const donde = error.fila ? error.archivo + ", " + textos.filaN.replace("{n}", error.fila) : error.archivo;
      const valor = error.valor ? " (" + error.valor + ")" : "";
      lista.append(crearElemento("li", "", donde + valor + ": " + textos[error.clave]));
    });
    caja.append(lista);
  }
}

// ---------- Plantilla ----------

// Excel con el encabezado y una fila de ejemplo, para pasarle a cada persona del equipo.
async function descargarPlantillaPedidos() {
  const textos = TEXTOS[idioma];
  const anio = datos.anio || new Date().getFullYear();

  try {
    await cargarLibreriaExcel();
  } catch (error) {
    document.getElementById("resultado-pedidos").replaceChildren(
      crearElemento("p", "error", textos.errorLibreriaExcel)
    );
    return;
  }

  // Las fechas van como fechas de verdad, así Excel no las confunde con texto.
  const filas = [
    [textos.nombre, textos.mail, textos.desde, textos.hasta],
    [textos.ejemploNombre, textos.ejemploMail, leerFecha(anio + "-08-03"), leerFecha(anio + "-08-14")],
  ];
  const hoja = XLSX.utils.aoa_to_sheet(filas, { cellDates: true });
  const formato = idioma === "es" ? "dd/mm/yyyy" : "yyyy-mm-dd";
  hoja["C2"].z = formato;
  hoja["D2"].z = formato;
  hoja["!cols"] = [{ wch: 24 }, { wch: 28 }, { wch: 14 }, { wch: 14 }]; // ancho de las columnas

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, textos.hojaPedidos);
  XLSX.writeFile(libro, textos.nombrePlantillaPedidos + ".xlsx");
}

// ---------- Botones ----------

const entradaPedidos = document.getElementById("archivo-pedidos");

document.getElementById("boton-cargar-pedidos").addEventListener("click", () => entradaPedidos.click());
document.getElementById("boton-plantilla-pedidos").addEventListener("click", descargarPlantillaPedidos);
entradaPedidos.addEventListener("change", async () => {
  if (entradaPedidos.files.length) await cargarPedidos([...entradaPedidos.files]);
  entradaPedidos.value = ""; // para poder volver a elegir los mismos archivos
});
