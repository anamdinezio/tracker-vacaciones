// Aprobar un período: queda aprobado y aparece un aviso con el botón para mandarle el mail a la persona.
// El mail lleva el resumen del año (días del año, usados, pendientes y disponibles), así queda registro.
// Usa las funciones de solapes.js (armar el link del correo) y los datos de app.js.

// La última aprobación, para mostrar el aviso con el mail. Se borra al cambiar de persona.
let ultimaAprobacion = null;

// ---------- Texto del mail ----------

// Si el usuario no cambió el texto, se usa el del idioma actual.
function asuntoDeAprobacion() {
  return datos.mailAprobacionAsunto || TEXTOS[idioma].mailAprobacionAsuntoOriginal;
}

function textoDeAprobacion() {
  return datos.mailAprobacionTexto || TEXTOS[idioma].mailAprobacionTextoOriginal;
}

// Cambia los datos entre llaves por los de esa persona y ese período.
function completarAprobacion(texto, empleado, periodo) {
  const saldo = calcularSaldo(empleado);
  return texto
    .replaceAll("{nombre}", empleado.nombre)
    .replaceAll("{desde}", formatearFecha(periodo.desde))
    .replaceAll("{hasta}", formatearFecha(periodo.hasta))
    .replaceAll("{diasPeriodo}", contarDiasDeVacaciones(periodo, empleado))
    .replaceAll("{anio}", datos.anio)
    .replaceAll("{diasDelAnio}", saldo.faltanDias ? "—" : saldo.totalDias)
    .replaceAll("{arrastrados}", Number(empleado.diasArrastrados))
    .replaceAll("{usados}", saldo.diasUsados)
    .replaceAll("{pendientes}", saldo.diasPendientes)
    .replaceAll("{disponibles}", saldo.faltanDias ? "—" : saldo.diasDisponibles);
}

function linkDeAprobacion(empleado, periodo) {
  return armarLinkDeCorreo(
    empleado.mail,
    completarAprobacion(asuntoDeAprobacion(), empleado, periodo),
    completarAprobacion(textoDeAprobacion(), empleado, periodo)
  );
}

// ---------- Aprobar ----------

function aprobarPeriodo(posicion) {
  const empleado = empleadoActual();
  const periodo = empleado.periodos[posicion];
  periodo.estado = "aprobado";
  ultimaAprobacion = { empleado, periodo };
  guardarDatos();
  actualizarPantalla();
}

// Aviso verde arriba de la lista de períodos, con el botón para avisar por mail.
function mostrarAprobacion() {
  const caja = document.getElementById("aviso-aprobacion");
  caja.innerHTML = "";
  // Solo si la aprobación es de la persona que se está viendo y el período sigue aprobado.
  if (!ultimaAprobacion || ultimaAprobacion.empleado !== empleadoActual()) return;
  const { empleado, periodo } = ultimaAprobacion;
  if (!empleado.periodos.includes(periodo) || estadoDe(periodo) !== "aprobado") return;

  const textos = TEXTOS[idioma];
  const nombre = empleado.nombre || textos.sinNombre;
  const exito = crearElemento("div", "exito");
  exito.append(
    crearElemento(
      "p",
      "",
      textos.aprobaste
        .replace("{nombre}", nombre)
        .replace("{desde}", formatearFecha(periodo.desde))
        .replace("{hasta}", formatearFecha(periodo.hasta))
    )
  );

  const acciones = crearElemento("div", "acciones-aprobacion");
  if (empleado.mail) {
    const enlace = crearElemento("a", "boton-chico boton-aprobar", textos.avisarAprobacion.replace("{nombre}", nombre));
    enlace.href = linkDeAprobacion(empleado, periodo);
    if (datos.correo !== "programa") {
      enlace.target = "_blank";
      enlace.rel = "noopener";
    }
    acciones.append(enlace);
  } else {
    acciones.append(crearElemento("span", "etiqueta-problema", textos.faltaMail.replace("{nombre}", nombre)));
  }
  exito.append(acciones);
  caja.append(exito);
}

// ---------- Campos del texto ----------

const campoAprobacionAsunto = document.getElementById("mail-aprobacion-asunto");
const campoAprobacionTexto = document.getElementById("mail-aprobacion-texto");

function mostrarTextoDeAprobacion() {
  // Se rellenan solo si el usuario no está escribiendo en ellos.
  if (document.activeElement !== campoAprobacionAsunto) campoAprobacionAsunto.value = asuntoDeAprobacion();
  if (document.activeElement !== campoAprobacionTexto) campoAprobacionTexto.value = textoDeAprobacion();
  document.getElementById("boton-aprobacion-original").hidden =
    !datos.mailAprobacionAsunto && !datos.mailAprobacionTexto;
}

campoAprobacionAsunto.addEventListener("input", () => {
  datos.mailAprobacionAsunto = campoAprobacionAsunto.value;
  guardarDatos();
  mostrarAprobacion();
});

campoAprobacionTexto.addEventListener("input", () => {
  datos.mailAprobacionTexto = campoAprobacionTexto.value;
  guardarDatos();
  mostrarAprobacion();
});

document.getElementById("boton-aprobacion-original").addEventListener("click", () => {
  datos.mailAprobacionAsunto = "";
  datos.mailAprobacionTexto = "";
  guardarDatos();
  mostrarTextoDeAprobacion();
  mostrarAprobacion();
});
