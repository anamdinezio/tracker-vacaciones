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
// Más adelante se suman acá los festivos y los períodos de vacaciones.
let datos = cargarDatos();

function cargarDatos() {
  try {
    const texto = localStorage.getItem(CLAVE_DATOS);
    if (texto) return JSON.parse(texto);
  } catch (error) {
    // Si no se puede leer, arrancamos de cero.
  }
  return { empleado: empleadoVacio() };
}

function guardarDatos() {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
  } catch (error) {
    // Si no se puede guardar, la página sigue funcionando hasta recargar.
  }
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
  const { anio, inicioContrato, finContrato } = empleado;

  if (inicioContrato && finContrato && finContrato < inicioContrato) {
    return "errorFechasContrato";
  }

  const fueraDelAnio = (fecha) => fecha && !fecha.startsWith(anio + "-");
  if (fueraDelAnio(inicioContrato) || fueraDelAnio(finContrato)) {
    return "errorContratoFueraDelAnio";
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
}

// ---------- Arranque ----------

document.getElementById("boton-idioma").addEventListener("click", cambiarIdioma);
formulario.addEventListener("input", alCambiarFormulario);
mostrarEmpleado();
errorActual = validarEmpleado(datos.empleado);
aplicarIdioma();
