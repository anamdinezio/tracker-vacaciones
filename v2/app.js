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
  mostrarBotonTema();
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

// ---------- Modo claro / oscuro ----------
// El tema inicial se aplica en index.html, antes de dibujar la página.

const ICONO_LUNA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICONO_SOL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

function temaActual() {
  return document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro";
}

// El botón muestra el modo al que se pasa: luna si está en claro, sol si está en oscuro.
function mostrarBotonTema() {
  const boton = document.getElementById("boton-tema");
  const textos = TEXTOS[idioma];
  const oscuro = temaActual() === "oscuro";
  boton.innerHTML = oscuro ? ICONO_SOL : ICONO_LUNA;
  boton.title = oscuro ? textos.modoClaro : textos.modoOscuro;
  boton.setAttribute("aria-label", boton.title);
}

function cambiarTema() {
  const nuevo = temaActual() === "oscuro" ? "claro" : "oscuro";
  if (nuevo === "oscuro") {
    document.documentElement.dataset.tema = "oscuro";
  } else {
    delete document.documentElement.dataset.tema;
  }
  try {
    localStorage.setItem("tema", nuevo);
  } catch (error) {
    // Si no se puede guardar, el cambio funciona igual hasta recargar.
  }
  mostrarBotonTema();
}

// ---------- Datos del equipo ----------

const CLAVE_DATOS = "gestorVacacionesV2"; // distinta de la v1, para no pisar sus datos
const CLAVE_DATOS_V1 = "gestorVacaciones";
const formulario = document.getElementById("form-empleado");

// Valores con los que arranca cada persona nueva.
function empleadoVacio() {
  return {
    nombre: "",
    mail: "",
    inicioContrato: "",
    finContrato: "",
    diasVacaciones: "",
    diasArrastrados: "",
    diasLaborables: [1, 2, 3, 4, 5], // de lunes a viernes
    formaDeContar: "laborables",
    periodos: [], // lista de { desde, hasta }
  };
}

// Todo lo que guarda la app vive en un solo objeto.
// El año y los festivos son de todo el equipo. El resto es de cada persona.
function datosVacios() {
  return {
    anio: new Date().getFullYear(),
    festivos: [], // lista de { fecha, nombre }
    empleados: [empleadoVacio()],
    seleccionado: 0, // posición de la persona que se está viendo
    avisarSolapes: true,
    mailAsunto: "", // vacío: se usa el texto original del idioma actual
    mailTexto: "",
  };
}

// Pasa los datos de la v1 (un solo empleado) al formato de la v2.
function convertirDesdeV1(v1) {
  const { anio, ...empleado } = v1.empleado;
  return {
    ...datosVacios(),
    anio: anio || new Date().getFullYear(),
    festivos: v1.festivos ?? [],
    empleados: [{ ...empleadoVacio(), ...empleado, periodos: v1.periodos ?? [] }],
  };
}

let datos = cargarDatos();

// Si es la primera vez que se abre la v2 y hay datos de la v1, se arranca con esos.
function cargarDatos() {
  try {
    const texto = localStorage.getItem(CLAVE_DATOS);
    if (texto) return { ...datosVacios(), ...JSON.parse(texto) };

    const textoV1 = localStorage.getItem(CLAVE_DATOS_V1);
    if (textoV1) return convertirDesdeV1(JSON.parse(textoV1));
  } catch (error) {
    // Si no se puede leer, arrancamos de cero.
  }
  return datosVacios();
}

// La persona que se está viendo y editando.
function empleadoActual() {
  return datos.empleados[datos.seleccionado];
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
  const empleado = empleadoActual();
  formulario.nombre.value = empleado.nombre;
  formulario.mail.value = empleado.mail;
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
    mail: formulario.mail.value.trim(),
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
  const { inicioContrato, finContrato, mail } = empleado;

  if (inicioContrato && finContrato && finContrato < inicioContrato) {
    return "errorFechasContrato";
  }
  // Un control simple: algo, una @, algo, un punto y algo.
  if (mail && !/^\S+@\S+\.\S+$/.test(mail)) return "errorMail";

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

  // Los períodos no están en el formulario: se conservan los que ya tenía.
  datos.empleados[datos.seleccionado] = { ...empleado, periodos: empleadoActual().periodos };
  guardarDatos();
  actualizarPantalla();
}

// ---------- Equipo ----------

const campoAnio = document.getElementById("campo-anio");

function alCambiarAnio() {
  datos.anio = Number(campoAnio.value);
  guardarDatos();
  actualizarPantalla();
}

// Cambia la persona que se ve en los pasos de abajo.
function elegirEmpleado(posicion) {
  datos.seleccionado = posicion;
  guardarDatos();
  cancelarEdicionPeriodo();
  mostrarEmpleado();
  errorActual = validarEmpleado(empleadoActual());
  mostrarError();
  actualizarPantalla();
}

function agregarEmpleado() {
  datos.empleados.push(empleadoVacio());
  elegirEmpleado(datos.empleados.length - 1);

  // Abre los datos de la persona nueva para completarlos.
  const seccion = document.getElementById("seccion-empleado");
  seccion.open = true;
  seccion.scrollIntoView({ behavior: "smooth" });
  formulario.nombre.focus({ preventScroll: true });
}

function borrarEmpleado(posicion) {
  const textos = TEXTOS[idioma];
  const nombre = datos.empleados[posicion].nombre || textos.sinNombre;
  if (!confirm(textos.confirmarBorrarEmpleado.replace("{nombre}", nombre))) return;

  datos.empleados.splice(posicion, 1);
  // Si se borró a la persona elegida o a alguien de arriba, la elegida se corre un lugar.
  if (datos.seleccionado >= posicion) datos.seleccionado = Math.max(0, datos.seleccionado - 1);
  elegirEmpleado(datos.seleccionado);
}

// Lista del equipo: nombre, mail y días disponibles de cada persona.
function mostrarEquipo() {
  const textos = TEXTOS[idioma];
  campoAnio.value = datos.anio || "";
  const lista = document.getElementById("lista-equipo");
  lista.innerHTML = "";

  datos.empleados.forEach((empleado, posicion) => {
    const fila = document.createElement("li");
    fila.classList.toggle("fila-editando", posicion === datos.seleccionado);

    const nombre = crearElemento("span", "", empleado.nombre || textos.sinNombre);
    const mail = crearElemento("span", "lista-detalle", empleado.mail);
    const disponibles = crearElemento(
      "span",
      "lista-detalle",
      textos.disponiblesCorto.replace("{n}", calcularSaldo(empleado).diasDisponibles)
    );

    fila.append(nombre, mail, disponibles);
    if (posicion !== datos.seleccionado) {
      fila.append(crearBotonDeFila(textos.ver, "boton-editar", () => elegirEmpleado(posicion)));
    }
    // Siempre queda al menos una persona.
    if (datos.empleados.length > 1) {
      fila.append(crearBotonDeFila(textos.borrar, "boton-borrar", () => borrarEmpleado(posicion)));
    }
    lista.append(fila);
  });

  // Los pasos de abajo llevan el nombre de la persona elegida.
  const nombre = empleadoActual().nombre || textos.sinNombre;
  document.getElementById("titulo-datos-empleado").textContent = textos.datosDe.replace("{nombre}", nombre);
  document.getElementById("titulo-periodos").textContent = textos.periodosDe.replace("{nombre}", nombre);
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

// Días de vacaciones que le tocan en el año elegido.
// Si el contrato no cubre el año entero, se calcula la parte proporcional:
// días por año completo × días de contrato en el año / días del año, redondeado al más cercano.
function calcularDiasDelAnio(empleado = empleadoActual()) {
  const { inicioContrato, finContrato, diasVacaciones } = empleado;
  const anio = datos.anio;
  const completo = Number(diasVacaciones); // Number("") da 0
  const inicioAnio = anio + "-01-01";
  const finAnio = anio + "-12-31";

  // La parte del contrato que cae dentro del año.
  const desde = inicioContrato && inicioContrato > inicioAnio ? inicioContrato : inicioAnio;
  const hasta = finContrato && finContrato < finAnio ? finContrato : finAnio;

  const UN_DIA = 24 * 60 * 60 * 1000;
  const diasAnio = Math.round((leerFecha(finAnio) - leerFecha(inicioAnio)) / UN_DIA) + 1; // 365 o 366
  const diasContrato = hasta < desde ? 0 : Math.round((leerFecha(hasta) - leerFecha(desde)) / UN_DIA) + 1;

  const exacto = (completo * diasContrato) / diasAnio;
  return {
    completo,
    diasContrato,
    diasAnio,
    exacto,
    dias: Math.round(exacto),
    esProporcional: anio > 0 && diasContrato < diasAnio,
  };
}

// Debajo del campo de días: cómo se calculó la parte proporcional.
function mostrarCalculoProporcional(calculo) {
  const textos = TEXTOS[idioma];
  const nota = document.getElementById("nota-proporcional");
  if (!calculo.esProporcional || calculo.completo <= 0) {
    nota.textContent = "";
    return;
  }
  const decimales = calculo.exacto.toLocaleString(idioma, { maximumFractionDigits: 2 });
  nota.textContent = textos.calculoProporcional
    .replace("{completo}", calculo.completo)
    .replaceAll("{contrato}", calculo.diasContrato)
    .replaceAll("{anio}", calculo.diasAnio)
    .replace("{exacto}", decimales)
    .replace("{dias}", calculo.dias);
}

// Total, usados y disponibles de una persona.
function calcularSaldo(empleado) {
  const calculo = calcularDiasDelAnio(empleado);
  const totalDias = calculo.dias + Number(empleado.diasArrastrados);
  const diasUsados = empleado.periodos.reduce(
    (suma, periodo) => suma + contarDiasDeVacaciones(periodo, empleado),
    0
  );
  return { calculo, totalDias, diasUsados, diasDisponibles: totalDias - diasUsados };
}

function mostrarResumen() {
  const textos = TEXTOS[idioma];
  const empleado = empleadoActual();

  const { calculo, totalDias, diasUsados, diasDisponibles } = calcularSaldo(empleado);
  mostrarCalculoProporcional(calculo);

  document.getElementById("titulo-resumen").textContent = empleado.nombre
    ? textos.resumenDe.replace("{nombre}", empleado.nombre)
    : textos.resumen;
  document.getElementById("total-dias").textContent = totalDias;

  // Entre paréntesis: si es proporcional y si incluye días del año anterior.
  const arrastrados = Number(empleado.diasArrastrados);
  let detalle = "";
  if (calculo.esProporcional && arrastrados > 0) {
    detalle = textos.proporcionalMasArrastrados.replace("{dias}", calculo.dias).replace("{n}", arrastrados);
  } else if (calculo.esProporcional && calculo.completo > 0) {
    detalle = textos.proporcionalAlContrato;
  } else if (arrastrados > 0) {
    detalle = textos.incluyeArrastrados.replace("{n}", arrastrados);
  }
  document.getElementById("detalle-arrastrados").textContent = detalle;
  document.getElementById("dias-usados").textContent = diasUsados;

  // El mismo saldo, en chico, debajo del formulario de períodos.
  document.getElementById("saldo-periodos").textContent = empleadoActual().periodos.length
    ? textos.saldoPeriodos.replace("{usados}", diasUsados).replace("{disponibles}", diasDisponibles)
    : "";

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
  document.getElementById("nota-sin-periodos").hidden = empleadoActual().periodos.length > 0;
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
// Las funciones de esta sección miran a la persona elegida, salvo que se les pase otra.
function estaDentroDelContrato(texto, empleado = empleadoActual()) {
  const { inicioContrato, finContrato } = empleado;
  if (!texto.startsWith(datos.anio + "-")) return false;
  if (inicioContrato && texto < inicioContrato) return false;
  if (finContrato && texto > finContrato) return false;
  return true;
}

function esFestivo(texto) {
  return datos.festivos.some((festivo) => festivo.fecha === texto);
}

function trabajaEseDia(fecha, empleado = empleadoActual()) {
  return empleado.diasLaborables.includes(fecha.getDay());
}

// ¿Un día de vacaciones se descuenta del saldo?
// Laborables: solo los días que trabaja y que no son festivos.
// Naturales: todos los días, festivos incluidos.
// En los dos casos, solo si cae dentro del año y del contrato.
function cuentaComoVacaciones(fecha, empleado = empleadoActual()) {
  const texto = fechaATexto(fecha);
  if (!estaDentroDelContrato(texto, empleado)) return false;
  if (empleado.formaDeContar === "naturales") return true;
  return trabajaEseDia(fecha, empleado) && !esFestivo(texto);
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

function contarDiasDeVacaciones(periodo, empleado = empleadoActual()) {
  let cantidad = 0;
  recorrerPeriodo(periodo, (fecha) => {
    if (cuentaComoVacaciones(fecha, empleado)) cantidad++;
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
  const { inicioContrato, finContrato } = empleadoActual();
  const anio = datos.anio;

  if (!desde || !hasta) return "errorPeriodoIncompleto";
  if (hasta < desde) return "errorPeriodoOrden";
  if (!desde.startsWith(anio + "-") || !hasta.startsWith(anio + "-")) return "errorPeriodoFueraDelAnio";
  if ((inicioContrato && desde < inicioContrato) || (finContrato && hasta > finContrato)) {
    return "errorPeriodoFueraDelContrato";
  }

  // Dos períodos se pisan si uno empieza antes de que termine el otro.
  // El que se está editando no cuenta, porque se va a reemplazar.
  const sePisa = empleadoActual().periodos.some(
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
    empleadoActual().periodos[periodoEditando] = periodo; // reemplaza el que se estaba editando
  } else {
    empleadoActual().periodos.push(periodo);
  }
  empleadoActual().periodos.sort((a, b) => a.desde.localeCompare(b.desde)); // ordenados por fecha
  guardarDatos();
  cancelarEdicionPeriodo();
}

// Pasa las fechas del período al formulario de arriba para cambiarlas.
function editarPeriodo(posicion) {
  periodoEditando = posicion;
  formPeriodo.desde.value = empleadoActual().periodos[posicion].desde;
  formPeriodo.hasta.value = empleadoActual().periodos[posicion].hasta;
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
  empleadoActual().periodos.splice(posicion, 1);
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

  empleadoActual().periodos.forEach((periodo, posicion) => {
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
    // Si se pidió el aviso, también se marca con quién se solapa.
    const otros = datos.avisarSolapes ? conQuienSeSolapa(periodo) : [];
    if (otros.length) {
      aviso.textContent += (aviso.textContent ? " " : "") + textos.seSolapaCon.replace("{nombres}", otros.join(", "));
    }

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
  if (!festivo.fecha.startsWith(datos.anio + "-")) return "errorFestivoFueraDelAnio";

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
  mostrarEquipo();
  mostrarResumen();
  mostrarDiasPorMes();
  mostrarCalendario();
  mostrarPeriodos();
  mostrarFestivos();
  mostrarSolapes();
}

// ---------- Arranque ----------

formPeriodo.addEventListener("submit", guardarPeriodo);
formFestivo.addEventListener("submit", guardarFestivo);
formPeriodo.querySelector(".boton-cancelar").addEventListener("click", cancelarEdicionPeriodo);
formFestivo.querySelector(".boton-cancelar").addEventListener("click", cancelarEdicionFestivo);

document.getElementById("boton-idioma").addEventListener("click", cambiarIdioma);
document.getElementById("boton-tema").addEventListener("click", cambiarTema);
document.getElementById("boton-agregar-empleado").addEventListener("click", agregarEmpleado);
campoAnio.addEventListener("input", alCambiarAnio);

// Las secciones plegables recuerdan si el usuario las abrió o cerró.
// Si nunca las tocó: "Datos del empleado" arranca plegada cuando ya está completa,
// así quien vuelve llega rápido a sus vacaciones. Las demás arrancan abiertas.
function empleadoCompleto() {
  const empleado = empleadoActual();
  return empleado.nombre !== "" && empleado.diasVacaciones !== "" && !validarEmpleado(empleado);
}

document.querySelectorAll(".plegable").forEach((seccion) => {
  const clave = "plegable-" + seccion.id;
  let elegido = null;
  try {
    elegido = localStorage.getItem(clave);
  } catch (error) {
    // Si no se puede leer, se usa el valor de inicio.
  }
  if (elegido) {
    seccion.open = elegido === "abierta";
  } else if (seccion.id === "seccion-empleado") {
    seccion.open = !empleadoCompleto();
  }

  // Se guarda solo cuando el usuario toca el título (no cuando la abre el código).
  seccion.querySelector("summary").addEventListener("click", () => {
    setTimeout(() => {
      try {
        localStorage.setItem(clave, seccion.open ? "abierta" : "cerrada");
      } catch (error) {
        // Si no se puede guardar, funciona igual hasta recargar.
      }
    });
  });
});
formulario.addEventListener("input", alCambiarFormulario);
mostrarEmpleado();
errorActual = validarEmpleado(empleadoActual());
aplicarIdioma();
