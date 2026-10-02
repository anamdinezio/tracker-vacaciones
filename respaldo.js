// Respaldo: descargar todos los datos en un archivo y volver a cargarlos.
// Sirve para pasar los datos a otra computadora o no perderlos si se borra el navegador.
// Usa las funciones y los datos de app.js (se llaman cuando la página ya cargó todo).

const MARCA_RESPALDO = "gestor-vacaciones"; // para reconocer que el archivo es de esta app

// Mensaje del último respaldo (clave del texto y datos), para traducirlo si cambia el idioma.
let resultadoRespaldo = null;

function descargarRespaldo() {
  const contenido = {
    app: MARCA_RESPALDO,
    version: 1,
    fecha: fechaATexto(new Date()),
    datos: datos,
  };

  // Nombre del archivo: respaldo-vacaciones-ana-di-nezio-2026-10-02.json
  const nombre = datos.empleado.nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca los acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const partes = [TEXTOS[idioma].nombreRespaldo, nombre, contenido.fecha].filter(Boolean);

  const archivo = new Blob([JSON.stringify(contenido, null, 2)], { type: "application/json" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = partes.join("-") + ".json";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

// Revisa que lo que vino en el archivo tenga la forma esperada.
// Devuelve los datos listos para usar, o null si el archivo no sirve.
function revisarRespaldo(contenido) {
  if (!contenido || contenido.app !== MARCA_RESPALDO || !contenido.datos) return null;
  const { empleado, periodos, festivos } = contenido.datos;
  if (!empleado || typeof empleado !== "object") return null;

  const esFecha = (texto) => typeof texto === "string" && /^\d{4}-\d{2}-\d{2}$/.test(texto);

  return {
    // Lo que falte en el archivo se completa con los valores de inicio.
    empleado: { ...empleadoVacio(), ...empleado },
    periodos: (Array.isArray(periodos) ? periodos : []).filter((p) => esFecha(p.desde) && esFecha(p.hasta)),
    festivos: (Array.isArray(festivos) ? festivos : [])
      .filter((f) => esFecha(f.fecha))
      .map((f) => ({ fecha: f.fecha, nombre: String(f.nombre || "") })),
  };
}

async function cargarRespaldo(archivo) {
  const textos = TEXTOS[idioma];
  let nuevos = null;
  try {
    nuevos = revisarRespaldo(JSON.parse(await archivo.text()));
  } catch (error) {
    // Si no es un JSON válido, nuevos queda en null.
  }

  if (!nuevos) {
    resultadoRespaldo = { clave: "errorRespaldo" };
    mostrarResultadoRespaldo();
    return;
  }

  // Cargar un respaldo pisa lo que hay, así que se pregunta antes.
  if (!confirm(textos.confirmarRespaldo)) return;

  datos = nuevos;
  guardarDatos();
  cancelarEdicionPeriodo();
  cancelarEdicionFestivo();
  mostrarEmpleado();
  errorActual = validarEmpleado(datos.empleado);
  mostrarError();
  actualizarPantalla();

  resultadoRespaldo = {
    clave: "respaldoCargado",
    periodos: datos.periodos.length,
    festivos: datos.festivos.length,
  };
  mostrarResultadoRespaldo();
}

function mostrarResultadoRespaldo() {
  const caja = document.getElementById("resultado-respaldo");
  caja.innerHTML = "";
  if (!resultadoRespaldo) return;

  const textos = TEXTOS[idioma];
  const { clave, periodos, festivos } = resultadoRespaldo;
  const texto = textos[clave].replace("{periodos}", periodos).replace("{festivos}", festivos);
  caja.append(crearElemento("p", clave === "errorRespaldo" ? "error" : "aclaracion", texto));
}

// ---------- Empezar de cero ----------

// Deja la página en blanco. El idioma, el tema y las secciones plegadas se mantienen.
function borrarTodo() {
  if (!confirm(TEXTOS[idioma].confirmarBorrarTodo)) return;

  datos = { empleado: empleadoVacio(), periodos: [], festivos: [] };
  guardarDatos();
  cancelarEdicionPeriodo();
  cancelarEdicionFestivo();
  mostrarEmpleado();
  errorActual = "";
  mostrarError();
  resultadoImportacion = null;
  mostrarResultadoImportacion();
  actualizarPantalla();

  resultadoRespaldo = { clave: "datosBorrados" };
  mostrarResultadoRespaldo();

  // Volver al paso 1, abierto.
  const seccionEmpleado = document.getElementById("seccion-empleado");
  seccionEmpleado.open = true;
  seccionEmpleado.scrollIntoView({ behavior: "smooth" });
}

// ---------- Botones ----------

const entradaRespaldo = document.getElementById("archivo-respaldo");

document.getElementById("boton-descargar-respaldo").addEventListener("click", descargarRespaldo);
document.getElementById("boton-borrar-todo").addEventListener("click", borrarTodo);
document.getElementById("boton-cargar-respaldo").addEventListener("click", () => entradaRespaldo.click());
entradaRespaldo.addEventListener("change", async () => {
  if (entradaRespaldo.files.length) await cargarRespaldo(entradaRespaldo.files[0]);
  entradaRespaldo.value = ""; // para poder volver a elegir el mismo archivo
});
