// ---------- Idioma ----------

// Idioma actual de la página: "es" o "en".
let idioma = elegirIdiomaInicial();

// Si el usuario ya eligió un idioma antes, usamos ese.
// Si no, usamos el del navegador (español si empieza con "es", si no inglés).
function elegirIdiomaInicial() {
  try {
    const guardado = localStorage.getItem("idioma");
    if (guardado === "es" || guardado === "en") return guardado;
  } catch (error) {
    // Algunos navegadores bloquean localStorage (por ejemplo en modo privado).
  }
  return navigator.language.startsWith("es") ? "es" : "en";
}

// Pone en cada elemento con data-i18n el texto del idioma actual.
function aplicarIdioma() {
  const textos = TEXTOS[idioma];
  document.documentElement.lang = idioma;
  document.title = textos.titulo;

  document.querySelectorAll("[data-i18n]").forEach((elemento) => {
    elemento.textContent = textos[elemento.dataset.i18n];
  });

  document.getElementById("boton-idioma").textContent = textos.cambiarIdioma;
  mostrarError();
  mostrarEstadoGuardado();
  actualizarPantalla();
  mostrarResultadoImportacion();
  mostrarResultadoRespaldo();
}

function cambiarIdioma() {
  idioma = idioma === "es" ? "en" : "es";
  try {
    localStorage.setItem("idioma", idioma);
  } catch (error) {
    // Si no se puede guardar, el cambio funciona igual hasta recargar.
  }
  aplicarIdioma();
}

// ---------- Datos del empleado ----------

const CLAVE_DATOS = "gestorVacaciones";
const formulario = document.getElementById("form-empleado");

// Valores con los que arranca alguien que entra por primera vez.
function empleadoVacio() {
  return {
    nombre: "",
    anio: new Date().getFullYear(),
    inicioContrato: "",
    finContrato: "",
    diasVacaciones: "",
    diasArrastrados: "",
    diasLaborables: [1, 2, 3, 4, 5], // de lunes a viernes
    formaDeContar: "laborables",
  };
}

// Todo lo que guarda la app vive en un solo objeto.
let datos = cargarDatos();

function cargarDatos() {
  let guardados = null;
  try {
    const texto = localStorage.getItem(CLAVE_DATOS);
    if (texto) guardados = JSON.parse(texto);
  } catch (error) {
    // Si no se puede leer, arrancamos de cero.
  }
  return {
    empleado: guardados?.empleado ?? empleadoVacio(),
    periodos: guardados?.periodos ?? [], // lista de { desde, hasta }
    festivos: guardados?.festivos ?? [], // lista de { fecha, nombre }
  };
}

function guardarDatos() {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
  } catch (error) {
    // Si no se puede guardar, la página sigue funcionando hasta recargar.
  }
  horaGuardado = new Date().toLocaleTimeString(idioma, { hour: "2-digit", minute: "2-digit" });
  mostrarEstadoGuardado();
}

// Copia los datos guardados al formulario.
function mostrarEmpleado() {
  const empleado = datos.empleado;
  formulario.nombre.value = empleado.nombre;
  formulario.anio.value = empleado.anio;
  formulario.inicioContrato.value = empleado.inicioContrato;
  formulario.finContrato.value = empleado.finContrato;
  formulario.diasVacaciones.value = empleado.diasVacaciones;
  formulario.diasArrastrados.value = empleado.diasArrastrados;

  formulario.querySelectorAll("[name=diasLaborables]").forEach((casilla) => {
    casilla.checked = empleado.diasLaborables.includes(Number(casilla.value));
  });

  formulario.formaDeContar.value = empleado.formaDeContar;
}

// Lee el formulario y lo pasa a un objeto con los datos del empleado.
function leerEmpleado() {
  const diasLaborables = [];
  formulario.querySelectorAll("[name=diasLaborables]:checked").forEach((casilla) => {
    diasLaborables.push(Number(casilla.value));
  });

  return {
    nombre: formulario.nombre.value.trim(),
    anio: Number(formulario.anio.value),
    inicioContrato: formulario.inicioContrato.value,
    finContrato: formulario.finContrato.value,
    diasVacaciones: formulario.diasVacaciones.value,
    diasArrastrados: formulario.diasArrastrados.value,
    diasLaborables: diasLaborables,
    formaDeContar: formulario.formaDeContar.value,
  };
}

// Devuelve la clave del texto de error, o "" si está todo bien.
// Las fechas vienen como "aaaa-mm-dd", así que se pueden comparar como texto.
function validarEmpleado(empleado) {
  const { inicioContrato, finContrato } = empleado;

  if (inicioContrato && finContrato && finContrato < inicioContrato) {
    return "errorFechasContrato";
  }

  return "";
}

// Clave del error que se está mostrando, para poder traducirlo al cambiar de idioma.
let errorActual = "";

function mostrarError() {
  const mensaje = document.getElementById("mensaje-error");
  mensaje.textContent = errorActual ? TEXTOS[idioma][errorActual] : "";
}

// Cada vez que cambia algo en el formulario: validar y guardar.
function alCambiarFormulario() {
  const empleado = leerEmpleado();
  errorActual = validarEmpleado(empleado);
  mostrarError();

  datos.empleado = empleado;
  guardarDatos();
  actualizarPantalla();
}

// Hora del último guardado. Vacía hasta que el usuario cambia algo.
let horaGuardado = "";

function mostrarEstadoGuardado() {
  const textos = TEXTOS[idioma];
  const estado = document.getElementById("estado-guardado");
  estado.textContent = horaGuardado
    ? textos.guardadoA.replace("{hora}", horaGuardado)
    : textos.notaGuardado;
}

// ---------- Resumen ----------

function mostrarResumen() {
  const textos = TEXTOS[idioma];
  const empleado = datos.empleado;

  // Number("") da 0, así que los campos vacíos cuentan como cero.
  const totalDias = Number(empleado.diasVacaciones) + Number(empleado.diasArrastrados);
  const diasUsados = datos.periodos.reduce((suma, periodo) => suma + contarDiasDeVacaciones(periodo), 0);
  const diasDisponibles = totalDias - diasUsados;

  document.getElementById("titulo-resumen").textContent = empleado.nombre
    ? textos.resumenDe.replace("{nombre}", empleado.nombre)
    : textos.resumen;
  document.getElementById("total-dias").textContent = totalDias;

  // Si hay días del año anterior, se aclaran entre paréntesis.
  const arrastrados = Number(empleado.diasArrastrados);
  document.getElementById("detalle-arrastrados").textContent =
    arrastrados > 0 ? textos.incluyeArrastrados.replace("{n}", arrastrados) : "";
  document.getElementById("dias-usados").textContent = diasUsados;

  // Festivos que caen en un día que trabaja (dentro del contrato): son días libres extra.
  const festivosLaborables = datos.festivos.filter(
    (festivo) => estaDentroDelContrato(festivo.fecha) && trabajaEseDia(leerFecha(festivo.fecha))
  ).length;
  document.getElementById("festivos-laborables").textContent = festivosLaborables;
  document.getElementById("dias-disponibles").textContent = diasDisponibles;

  // Menos de 5 días: naranja. Si se pasó de días: rojo.
  // Sin días cargados en el año no se marca nada.
  const indicador = document.getElementById("indicador-disponibles");
  indicador.classList.toggle("indicador-alerta", totalDias > 0 && diasDisponibles >= 0 && diasDisponibles < 5);
  indicador.classList.toggle("indicador-negativo", diasDisponibles < 0);
  document.getElementById("nota-sin-periodos").hidden = datos.periodos.length > 0;
}

// ---------- Fechas ----------

// Convierte "aaaa-mm-dd" en una fecha local (sin zona horaria),
// para que el día no se corra al cambiar de país.
function leerFecha(texto) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

// Lo contrario: de fecha a "aaaa-mm-dd".
function fechaATexto(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return fecha.getFullYear() + "-" + mes + "-" + dia;
}

// Muestra una fecha sin ambigüedad: "3 ago 2026" o "3 Aug 2026".
function formatearFecha(texto) {
  return leerFecha(texto).toLocaleDateString(idioma, { day: "numeric", month: "short", year: "numeric" });
}

// ---------- Listas: botones compartidos ----------

// Crea un botón chico para una fila de la lista (Editar o Borrar).
function crearBotonDeFila(texto, clase, alHacerClic) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-chico " + clase;
  boton.textContent = texto;
  boton.addEventListener("click", alHacerClic);
  return boton;
}

// Cambia el formulario entre "Agregar" y "Guardar cambios" (con Cancelar).
function mostrarModoFormulario(form, editando) {
  const textos = TEXTOS[idioma];
  form.querySelector("[type=submit]").textContent = editando ? textos.guardarCambios : textos.agregar;
  form.querySelector(".boton-cancelar").hidden = !editando;
}

// ---------- Períodos de vacaciones ----------

// ¿El día ("aaaa-mm-dd") cae dentro del año elegido y del contrato?
function estaDentroDelContrato(texto) {
  const { anio, inicioContrato, finContrato } = datos.empleado;
  if (!texto.startsWith(anio + "-")) return false;
  if (inicioContrato && texto < inicioContrato) return false;
  if (finContrato && texto > finContrato) return false;
  return true;
}

function esFestivo(texto) {
  return datos.festivos.some((festivo) => festivo.fecha === texto);
}

function trabajaEseDia(fecha) {
  return datos.empleado.diasLaborables.includes(fecha.getDay());
}

// ¿Un día de vacaciones se descuenta del saldo?
// Laborables: solo los días que trabaja y que no son festivos.
// Naturales: todos los días, festivos incluidos.
// En los dos casos, solo si cae dentro del año y del contrato.
function cuentaComoVacaciones(fecha) {
  const texto = fechaATexto(fecha);
  if (!estaDentroDelContrato(texto)) return false;
  if (datos.empleado.formaDeContar === "naturales") return true;
  return trabajaEseDia(fecha) && !esFestivo(texto);
}

// Recorre un período día por día y hace algo con cada fecha.
function recorrerPeriodo(periodo, hacerConCadaDia) {
  const dia = leerFecha(periodo.desde);
  const fin = leerFecha(periodo.hasta);
  while (dia <= fin) {
    hacerConCadaDia(new Date(dia));
    dia.setDate(dia.getDate() + 1); // pasar al día siguiente
  }
}

function contarDiasDeVacaciones(periodo) {
  let cantidad = 0;
  recorrerPeriodo(periodo, (fecha) => {
    if (cuentaComoVacaciones(fecha)) cantidad++;
  });
  return cantidad;
}

// Pasa si después de cargar el período se cambió el año o el contrato.
function tieneDiasFueraDelContrato(periodo) {
  let fuera = false;
  recorrerPeriodo(periodo, (fecha) => {
    if (!estaDentroDelContrato(fechaATexto(fecha))) fuera = true;
  });
  return fuera;
}

const formPeriodo = document.getElementById("form-periodo");
let errorPeriodo = "";
let periodoEditando = -1; // posición del período que se está editando; -1 si ninguno

// Devuelve la clave del texto de error, o "" si el período se puede guardar.
function validarPeriodo(periodo) {
  const { desde, hasta } = periodo;
  const { anio, inicioContrato, finContrato } = datos.empleado;

  if (!desde || !hasta) return "errorPeriodoIncompleto";
  if (hasta < desde) return "errorPeriodoOrden";
  if (!desde.startsWith(anio + "-") || !hasta.startsWith(anio + "-")) return "errorPeriodoFueraDelAnio";
  if ((inicioContrato && desde < inicioContrato) || (finContrato && hasta > finContrato)) {
    return "errorPeriodoFueraDelContrato";
  }

  // Dos períodos se pisan si uno empieza antes de que termine el otro.
  // El que se está editando no cuenta, porque se va a reemplazar.
  const sePisa = datos.periodos.some(
    (otro, posicion) => posicion !== periodoEditando && desde <= otro.hasta && hasta >= otro.desde
  );
  if (sePisa) return "errorPeriodoSolapado";

  return "";
}

function guardarPeriodo(evento) {
  evento.preventDefault(); // que el formulario no recargue la página

  const periodo = { desde: formPeriodo.desde.value, hasta: formPeriodo.hasta.value };
  errorPeriodo = validarPeriodo(periodo);
  mostrarErrorPeriodo();
  if (errorPeriodo) return;

  if (periodoEditando >= 0) {
    datos.periodos[periodoEditando] = periodo; // reemplaza el que se estaba editando
  } else {
    datos.periodos.push(periodo);
  }
  datos.periodos.sort((a, b) => a.desde.localeCompare(b.desde)); // ordenados por fecha
  guardarDatos();
  cancelarEdicionPeriodo();
}

// Pasa las fechas del período al formulario de arriba para cambiarlas.
function editarPeriodo(posicion) {
  periodoEditando = posicion;
  formPeriodo.desde.value = datos.periodos[posicion].desde;
  formPeriodo.hasta.value = datos.periodos[posicion].hasta;
  errorPeriodo = "";
  actualizarPantalla();
  formPeriodo.desde.focus();
}

function cancelarEdicionPeriodo() {
  periodoEditando = -1;
  errorPeriodo = "";
  formPeriodo.reset();
  actualizarPantalla();
}

function borrarPeriodo(posicion) {
  datos.periodos.splice(posicion, 1);
  guardarDatos();
  cancelarEdicionPeriodo();
}

function mostrarErrorPeriodo() {
  const mensaje = document.getElementById("error-periodo");
  mensaje.textContent = errorPeriodo ? TEXTOS[idioma][errorPeriodo] : "";
}

// Arma la lista de períodos cargados, con los días que usa cada uno.
function mostrarPeriodos() {
  const textos = TEXTOS[idioma];
  const lista = document.getElementById("lista-periodos");
  lista.innerHTML = "";

  datos.periodos.forEach((periodo, posicion) => {
    const fila = document.createElement("li");
    fila.classList.toggle("fila-editando", posicion === periodoEditando);

    const fechas = document.createElement("span");
    fechas.textContent = formatearFecha(periodo.desde) + " → " + formatearFecha(periodo.hasta);

    const dias = document.createElement("span");
    dias.className = "lista-detalle";
    dias.textContent = textos.cantidadDias.replace("{n}", contarDiasDeVacaciones(periodo));

    // Aviso si parte del período quedó fuera del año o del contrato (esos días no cuentan).
    const aviso = document.createElement("span");
    aviso.className = "lista-aviso";
    aviso.textContent = tieneDiasFueraDelContrato(periodo) ? textos.avisoFueraDelContrato : "";

    fila.append(
      fechas,
      aviso,
      dias,
      crearBotonDeFila(textos.editar, "boton-editar", () => editarPeriodo(posicion)),
      crearBotonDeFila(textos.borrar, "boton-borrar", () => borrarPeriodo(posicion))
    );
    lista.append(fila);
  });

  mostrarModoFormulario(formPeriodo, periodoEditando >= 0);
  mostrarErrorPeriodo();
}

// ---------- Festivos ----------

const formFestivo = document.getElementById("form-festivo");
let errorFestivo = "";
let festivoEditando = -1; // posición del festivo que se está editando; -1 si ninguno

// Devuelve la clave del texto de error, o "" si el festivo se puede guardar.
function validarFestivo(festivo) {
  if (!festivo.fecha) return "errorFestivoSinFecha";
  if (!festivo.fecha.startsWith(datos.empleado.anio + "-")) return "errorFestivoFueraDelAnio";

  const repetido = datos.festivos.some(
    (otro, posicion) => posicion !== festivoEditando && otro.fecha === festivo.fecha
  );
  if (repetido) return "errorFestivoRepetido";

  return "";
}

function guardarFestivo(evento) {
  evento.preventDefault(); // que el formulario no recargue la página

  const festivo = { fecha: formFestivo.fecha.value, nombre: formFestivo.nombre.value.trim() };
  errorFestivo = validarFestivo(festivo);
  mostrarErrorFestivo();
  if (errorFestivo) return;

  if (festivoEditando >= 0) {
    datos.festivos[festivoEditando] = festivo; // reemplaza el que se estaba editando
  } else {
    datos.festivos.push(festivo);
  }
  datos.festivos.sort((a, b) => a.fecha.localeCompare(b.fecha)); // ordenados por fecha
  guardarDatos();
  cancelarEdicionFestivo();
}

// Pasa el festivo al formulario de arriba para cambiarlo.
function editarFestivo(posicion) {
  festivoEditando = posicion;
  formFestivo.fecha.value = datos.festivos[posicion].fecha;
  formFestivo.nombre.value = datos.festivos[posicion].nombre;
  errorFestivo = "";
  actualizarPantalla();
  formFestivo.fecha.focus();
}

function cancelarEdicionFestivo() {
  festivoEditando = -1;
  errorFestivo = "";
  formFestivo.reset();
  actualizarPantalla();
}

function borrarFestivo(posicion) {
  datos.festivos.splice(posicion, 1);
  guardarDatos();
  cancelarEdicionFestivo();
}

function mostrarErrorFestivo() {
  const mensaje = document.getElementById("error-festivo");
  mensaje.textContent = errorFestivo ? TEXTOS[idioma][errorFestivo] : "";
}

// Arma la lista de festivos cargados.
function mostrarFestivos() {
  const textos = TEXTOS[idioma];
  const lista = document.getElementById("lista-festivos");
  lista.innerHTML = "";

  datos.festivos.forEach((festivo, posicion) => {
    const fila = document.createElement("li");
    fila.classList.toggle("fila-editando", posicion === festivoEditando);

    const fecha = document.createElement("span");
    fecha.textContent = formatearFecha(festivo.fecha);

    const nombre = document.createElement("span");
    nombre.className = "lista-detalle";
    nombre.textContent = festivo.nombre;

    fila.append(
      fecha,
      nombre,
      crearBotonDeFila(textos.editar, "boton-editar", () => editarFestivo(posicion)),
      crearBotonDeFila(textos.borrar, "boton-borrar", () => borrarFestivo(posicion))
    );
    lista.append(fila);
  });

  mostrarModoFormulario(formFestivo, festivoEditando >= 0);
  mostrarErrorFestivo();
}

// Vuelve a dibujar todo lo que depende de los datos.
function actualizarPantalla() {
  mostrarResumen();
  mostrarDiasPorMes();
  mostrarCalendario();
  mostrarPeriodos();
  mostrarFestivos();
}

// ---------- Arranque ----------

formPeriodo.addEventListener("submit", guardarPeriodo);
formFestivo.addEventListener("submit", guardarFestivo);
formPeriodo.querySelector(".boton-cancelar").addEventListener("click", cancelarEdicionPeriodo);
formFestivo.querySelector(".boton-cancelar").addEventListener("click", cancelarEdicionFestivo);

document.getElementById("boton-idioma").addEventListener("click", cambiarIdioma);

// Las secciones plegables recuerdan si quedaron abiertas o cerradas.
document.querySelectorAll(".plegable").forEach((seccion) => {
  const clave = "abierto-" + seccion.id;
  try {
    if (localStorage.getItem(clave) === "no") seccion.open = false;
  } catch (error) {
    // Si no se puede leer, queda abierta.
  }
  seccion.addEventListener("toggle", () => {
    try {
      localStorage.setItem(clave, seccion.open ? "si" : "no");
    } catch (error) {
      // Si no se puede guardar, funciona igual hasta recargar.
    }
  });
});
formulario.addEventListener("input", alCambiarFormulario);
mostrarEmpleado();
errorActual = validarEmpleado(datos.empleado);
aplicarIdioma();
