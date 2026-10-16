// Solapes: cuándo dos personas del equipo están de vacaciones los mismos días,
// y un mail para avisarle a la persona a la que no se le aprueba el período.
// Usa las funciones y los datos de app.js (se llaman cuando la página ya cargó todo).

// Busca, entre dos períodos de dos personas, los días que las dos se toman de vacaciones.
// Devuelve { desde, hasta } con el primer y el último día compartido, o null si no hay ninguno.
// Solo cuentan los días que se descuentan: si una no trabaja los sábados, un sábado no es solape.
function diasCompartidos(empleadoA, periodoA, empleadoB, periodoB) {
  const desde = periodoA.desde > periodoB.desde ? periodoA.desde : periodoB.desde;
  const hasta = periodoA.hasta < periodoB.hasta ? periodoA.hasta : periodoB.hasta;
  if (hasta < desde) return null;

  const compartidos = [];
  recorrerPeriodo({ desde, hasta }, (fecha) => {
    if (cuentaComoVacaciones(fecha, empleadoA) && cuentaComoVacaciones(fecha, empleadoB)) {
      compartidos.push(fechaATexto(fecha));
    }
  });
  if (compartidos.length === 0) return null;
  return { desde: compartidos[0], hasta: compartidos[compartidos.length - 1] };
}

// Lista de todos los solapes del equipo. Cada uno compara a dos personas, una sola vez.
function buscarSolapes() {
  const solapes = [];
  datos.empleados.forEach((empleadoA, a) => {
    datos.empleados.slice(a + 1).forEach((empleadoB) => {
      empleadoA.periodos.forEach((periodoA) => {
        empleadoB.periodos.forEach((periodoB) => {
          const dias = diasCompartidos(empleadoA, periodoA, empleadoB, periodoB);
          if (dias) solapes.push({ empleadoA, periodoA, empleadoB, periodoB, dias });
        });
      });
    });
  });
  return solapes;
}

// Nombres de las otras personas con las que se solapa un período de la persona elegida.
function conQuienSeSolapa(periodo) {
  const nombres = [];
  datos.empleados.forEach((otro, posicion) => {
    if (posicion === datos.seleccionado) return;
    const seSolapa = otro.periodos.some((suyo) => diasCompartidos(empleadoActual(), periodo, otro, suyo));
    if (seSolapa) nombres.push(otro.nombre || TEXTOS[idioma].sinNombre);
  });
  return nombres;
}

// ---------- Texto del mail ----------

// Si el usuario no cambió el texto, se usa el del idioma actual.
function asuntoDelMail() {
  return datos.mailAsunto || TEXTOS[idioma].mailAsuntoOriginal;
}

function textoDelMail() {
  return datos.mailTexto || TEXTOS[idioma].mailTextoOriginal;
}

// Cambia {nombre}, {desde}, {hasta}, {solapeDesde} y {solapeHasta} por los datos de ese solape.
function completarMail(texto, empleado, periodo, dias) {
  return texto
    .replaceAll("{nombre}", empleado.nombre)
    .replaceAll("{desde}", formatearFecha(periodo.desde))
    .replaceAll("{hasta}", formatearFecha(periodo.hasta))
    .replaceAll("{solapeDesde}", formatearFecha(dias.desde))
    .replaceAll("{solapeHasta}", formatearFecha(dias.hasta));
}

// Dirección para abrir un mail nuevo en cada correo, con destinatario, asunto y texto ya cargados.
// No se manda nada solo: el usuario lo revisa y lo envía desde su correo.
// "programa" usa un link mailto:, que abre el programa de correo predeterminado de la computadora.
const DIRECCIONES_CORREO = {
  gmail: (para, asunto, cuerpo) =>
    `https://mail.google.com/mail/?view=cm&fs=1&to=${para}&su=${asunto}&body=${cuerpo}`,
  outlook: (para, asunto, cuerpo) =>
    `https://outlook.live.com/mail/0/deeplink/compose?to=${para}&subject=${asunto}&body=${cuerpo}`,
  outlook365: (para, asunto, cuerpo) =>
    `https://outlook.office.com/mail/deeplink/compose?to=${para}&subject=${asunto}&body=${cuerpo}`,
  programa: (para, asunto, cuerpo) => `mailto:${para}?subject=${asunto}&body=${cuerpo}`,
};

function linkDelMail(empleado, periodo, dias) {
  const para = encodeURIComponent(empleado.mail);
  const asunto = encodeURIComponent(completarMail(asuntoDelMail(), empleado, periodo, dias));
  const cuerpo = encodeURIComponent(completarMail(textoDelMail(), empleado, periodo, dias));
  const armar = DIRECCIONES_CORREO[datos.correo] ?? DIRECCIONES_CORREO.gmail;
  return armar(para, asunto, cuerpo);
}

// Botón para avisarle a una de las dos personas. Si no tiene mail, queda la explicación.
function crearBotonAvisar(empleado, periodo, dias) {
  const textos = TEXTOS[idioma];
  const nombre = empleado.nombre || textos.sinNombre;
  if (!empleado.mail) {
    return crearElemento("span", "etiqueta-problema", textos.faltaMail.replace("{nombre}", nombre));
  }
  const enlace = crearElemento("a", "boton-chico boton-editar", textos.avisarA.replace("{nombre}", nombre));
  enlace.href = linkDelMail(empleado, periodo, dias);
  // Gmail y Outlook se abren en una pestaña nueva, para no salir de esta página.
  if (datos.correo !== "programa") {
    enlace.target = "_blank";
    enlace.rel = "noopener";
  }
  return enlace;
}

// ---------- Pantalla ----------

const casillaAvisar = document.getElementById("avisar-solapes");
const campoAsunto = document.getElementById("mail-asunto");
const campoTexto = document.getElementById("mail-texto");
const menuCorreo = document.getElementById("mail-correo");

function mostrarSolapes() {
  const textos = TEXTOS[idioma];
  const avisar = datos.avisarSolapes;
  casillaAvisar.checked = avisar;
  document.getElementById("contenido-solapes").hidden = !avisar;

  // Los campos del mail se rellenan solo si el usuario no está escribiendo en ellos.
  if (document.activeElement !== campoAsunto) campoAsunto.value = asuntoDelMail();
  if (document.activeElement !== campoTexto) campoTexto.value = textoDelMail();
  menuCorreo.value = datos.correo;
  document.getElementById("boton-texto-original").hidden = !datos.mailAsunto && !datos.mailTexto;

  const solapes = avisar ? buscarSolapes() : [];
  // El título y la pestaña muestran cuántos solapes hay.
  const titulo = solapes.length ? textos.solapesCantidad.replace("{n}", solapes.length) : textos.solapes;
  document.getElementById("titulo-solapes").textContent = titulo;
  const pestania = document.getElementById("pestania-solapes");
  pestania.textContent = titulo;
  pestania.classList.toggle("con-aviso", solapes.length > 0);

  const lista = document.getElementById("lista-solapes");
  lista.innerHTML = "";
  document.getElementById("nota-sin-solapes").hidden = solapes.length > 0;

  solapes.forEach(({ empleadoA, periodoA, empleadoB, periodoB, dias }) => {
    const fila = document.createElement("li");
    const descripcion = textos.solapeDescripcion
      .replace("{a}", empleadoA.nombre || textos.sinNombre)
      .replace("{b}", empleadoB.nombre || textos.sinNombre)
      .replace("{desde}", formatearFecha(dias.desde))
      .replace("{hasta}", formatearFecha(dias.hasta));

    fila.append(
      crearElemento("span", "", descripcion),
      crearBotonAvisar(empleadoA, periodoA, dias),
      crearBotonAvisar(empleadoB, periodoB, dias)
    );
    lista.append(fila);
  });
}

// ---------- Botones ----------

casillaAvisar.addEventListener("change", () => {
  datos.avisarSolapes = casillaAvisar.checked;
  guardarDatos();
  actualizarPantalla();
});

menuCorreo.addEventListener("change", () => {
  datos.correo = menuCorreo.value;
  guardarDatos();
  mostrarSolapes();
});

campoAsunto.addEventListener("input", () => {
  datos.mailAsunto = campoAsunto.value;
  guardarDatos();
  mostrarSolapes();
});

campoTexto.addEventListener("input", () => {
  datos.mailTexto = campoTexto.value;
  guardarDatos();
  mostrarSolapes();
});

document.getElementById("boton-texto-original").addEventListener("click", () => {
  datos.mailAsunto = "";
  datos.mailTexto = "";
  guardarDatos();
  mostrarSolapes();
});
