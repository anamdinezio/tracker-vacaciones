// Calendario anual con colores y gráfico de días de vacaciones por mes.
// Usa las funciones y los datos de app.js (se llaman cuando la página ya cargó todo).

// Qué se ve en el calendario. Se guarda en los datos:
// - datos.calendarioPersona: -1 para todo el equipo, o la posición de una persona.
// - datos.coloresPorPersona: en la vista del equipo, un color por persona o uno solo.
// - empleado.ocultoEnCalendario: la persona está apagada en la vista del equipo.

// Colores para cada persona, en orden. Si hay más personas que colores, se repiten.
const COLORES_PERSONAS = ["#2a7f6f", "#2f62c9", "#7b3fb5", "#c25a0e", "#c03a7a", "#5f7d1e", "#8a5a2b", "#4a5a73"];

// Se usan con transparencia ("59" al final es 35% en hexadecimal), así quedan suaves
// y el borde rojo de los solapes se distingue bien.
const TRANSPARENCIA = "59";

function colorDePersona(empleado) {
  return COLORES_PERSONAS[datos.empleados.indexOf(empleado) % COLORES_PERSONAS.length] + TRANSPARENCIA;
}

// La persona que se ve sola, o null si se ve todo el equipo.
function personaDelCalendario() {
  return datos.empleados[datos.calendarioPersona ?? -1] ?? null;
}

// El período (no rechazado) de una persona que incluye ese día, o undefined si no hay.
function periodoDelDia(empleado, texto) {
  return empleado.periodos.find(
    (periodo) => estadoDe(periodo) !== "rechazado" && texto >= periodo.desde && texto <= periodo.hasta
  );
}

// ¿Ese día de esa persona está pendiente de aprobar?
function estaPendiente(empleado, texto) {
  const periodo = periodoDelDia(empleado, texto);
  return Boolean(periodo) && estadoDe(periodo) === "pendiente";
}

// Personas encendidas que tienen ese día de vacaciones, aprobadas o pendientes
// (solo los días que se descuentan).
function quienesEstanDeVacaciones(fecha) {
  const texto = fechaATexto(fecha);
  return datos.empleados.filter(
    (empleado) =>
      !empleado.ocultoEnCalendario && periodoDelDia(empleado, texto) && cuentaComoVacaciones(fecha, empleado)
  );
}

// Vista del equipo: vacaciones si hay una persona, solape si hay dos o más.
// Si la única persona de ese día está pendiente, el día se ve como pendiente.
function tipoDeDiaEquipo(personas, texto) {
  if (personas.length >= 2) return "solape";
  if (personas.length === 1) return estaPendiente(personas[0], texto) ? "pendiente" : "vacaciones";
  if (esFestivo(texto)) return "festivo";
  return "laborable";
}

// Vista de una persona: qué tipo de día es, para elegir el color en el calendario.
function tipoDeDia(fecha, empleado = empleadoActual()) {
  const texto = fechaATexto(fecha);
  if (!estaDentroDelContrato(texto, empleado)) return "fuera";

  const periodo = periodoDelDia(empleado, texto);
  if (periodo && cuentaComoVacaciones(fecha, empleado)) {
    return estadoDe(periodo) === "pendiente" ? "pendiente" : "vacaciones";
  }
  if (esFestivo(texto)) return "festivo";
  if (!trabajaEseDia(fecha, empleado)) return "no-laborable";
  return "laborable";
}

// Con colores por persona, un día con varias personas se parte en franjas, una por color.
function pintarConColores(celda, personas, texto) {
  // Los pendientes, con un tono más claro todavía ("26" es 15%).
  const colores = personas.map((empleado) =>
    estaPendiente(empleado, texto) ? colorDePersona(empleado).slice(0, 7) + "26" : colorDePersona(empleado)
  );
  const ancho = 100 / colores.length;
  const franjas = colores.map((color, i) => `${color} ${i * ancho}% ${(i + 1) * ancho}%`);
  celda.style.background = `linear-gradient(135deg, ${franjas.join(", ")})`;
  celda.style.color = "var(--texto)";
  if (personas.length >= 2) celda.classList.add("dia-con-solape");
}

// ---------- Controles arriba del calendario ----------

function mostrarControlesCalendario() {
  const textos = TEXTOS[idioma];
  const persona = personaDelCalendario();

  // Desplegable "Ver": todo el equipo o una persona.
  const menu = document.getElementById("ver-calendario");
  menu.innerHTML = "";
  const todos = crearElemento("option", "", textos.todoElEquipo);
  todos.value = -1;
  menu.append(todos);
  datos.empleados.forEach((empleado, posicion) => {
    const opcion = crearElemento("option", "", empleado.nombre || textos.sinNombre);
    opcion.value = posicion;
    menu.append(opcion);
  });
  menu.value = persona ? datos.calendarioPersona : -1;

  // Colores y casillas de personas: solo en la vista del equipo.
  document.getElementById("opciones-equipo").hidden = Boolean(persona);
  document.querySelector(`[name=coloresCalendario][value=${datos.coloresPorPersona ? "persona" : "uno"}]`).checked = true;

  const lista = document.getElementById("personas-calendario");
  lista.innerHTML = "";
  datos.empleados.forEach((empleado) => {
    const etiqueta = crearElemento("label", "chip-persona");
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.checked = !empleado.ocultoEnCalendario;
    casilla.addEventListener("change", () => {
      empleado.ocultoEnCalendario = !casilla.checked;
      guardarDatos();
      mostrarCalendario();
    });
    etiqueta.append(casilla);
    // Con colores por persona, cada casilla lleva su color y sirve de leyenda.
    if (datos.coloresPorPersona) {
      const muestra = crearElemento("i", "muestra");
      muestra.style.background = colorDePersona(empleado);
      etiqueta.append(muestra);
    }
    etiqueta.append(crearElemento("span", "", empleado.nombre || textos.sinNombre));
    lista.append(etiqueta);
  });

  // Leyenda: algunas muestras solo tienen sentido en una de las vistas.
  document.querySelectorAll(".solo-vista-equipo").forEach((elemento) => (elemento.hidden = Boolean(persona)));
  document.querySelectorAll(".solo-vista-persona").forEach((elemento) => (elemento.hidden = !persona));
  document.querySelectorAll(".solo-un-color").forEach((elemento) => {
    elemento.hidden = Boolean(persona) || datos.coloresPorPersona;
  });
}

// Nombre del mes en el idioma actual, con mayúscula: "Enero", "Ene", "January", "Jan".
function nombreDelMes(mes, formato) {
  const texto = new Date(2000, mes, 1).toLocaleDateString(idioma, { month: formato }).replace(".", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Iniciales de los días de la semana, de lunes a domingo.
function inicialesDeLaSemana() {
  const iniciales = [];
  for (let i = 0; i < 7; i++) {
    // El 3 de enero de 2000 fue lunes.
    iniciales.push(new Date(2000, 0, 3 + i).toLocaleDateString(idioma, { weekday: "narrow" }));
  }
  return iniciales;
}

// Lista de 12 números: cuántos días de vacaciones se usan cada mes.
function diasDeVacacionesPorMes(empleado = empleadoActual()) {
  const porMes = new Array(12).fill(0);
  // Solo los aprobados, igual que los días usados.
  empleado.periodos.filter((periodo) => estadoDe(periodo) === "aprobado").forEach((periodo) => {
    recorrerPeriodo(periodo, (fecha) => {
      if (cuentaComoVacaciones(fecha, empleado)) porMes[fecha.getMonth()]++;
    });
  });
  return porMes;
}

// Atajo para crear un elemento con una clase y un texto.
function crearElemento(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

// Gráfico de barras: una columna por mes, la más alta es el mes con más días.
function mostrarDiasPorMes() {
  const porMes = diasDeVacacionesPorMes();
  const maximo = Math.max(...porMes, 1);
  const grafico = document.getElementById("dias-por-mes");
  grafico.innerHTML = "";
  document.getElementById("bloque-dias-por-mes").hidden = empleadoActual().periodos.length === 0;

  porMes.forEach((cantidad, mes) => {
    const columna = crearElemento("div", "columna-mes");
    const area = crearElemento("div", "columna-area");
    const barra = crearElemento("div", "columna-barra");
    barra.style.height = (cantidad / maximo) * 100 + "%";

    area.append(crearElemento("span", "columna-numero", cantidad || ""), barra);
    columna.append(area, crearElemento("span", "columna-etiqueta", nombreDelMes(mes, "short")));
    grafico.append(columna);
  });
}

// Los 12 meses del año, con cada día pintado según su tipo.
function mostrarCalendario() {
  const textos = TEXTOS[idioma];
  const anio = datos.anio;
  const contenedor = document.getElementById("calendario");
  contenedor.innerHTML = "";
  const titulo = document.getElementById("titulo-calendario");
  titulo.textContent = textos.calendario.replace("{anio}", anio || "");
  const persona = personaDelCalendario();
  const equipo = !persona;
  // En la hoja impresa el título lleva también el nombre de la persona, o "Todo el equipo".
  const nombreImpreso = equipo ? textos.todoElEquipo : persona.nombre;
  if (nombreImpreso) {
    titulo.append(crearElemento("span", "solo-impresion", " · " + nombreImpreso));
  }
  mostrarControlesCalendario();

  if (!anio) return; // sin año no hay calendario

  const porMes = equipo ? [] : diasDeVacacionesPorMes(persona);
  const hoy = fechaATexto(new Date());
  const iniciales = inicialesDeLaSemana();

  for (let mes = 0; mes < 12; mes++) {
    const titulo = crearElemento("div", "mes-titulo");
    // Los días por mes son de la persona elegida: en la vista del equipo no se muestran.
    const cantidad = !equipo && porMes[mes] ? textos.cantidadDias.replace("{n}", porMes[mes]) : "";
    titulo.append(crearElemento("span", "", nombreDelMes(mes, "long")), crearElemento("span", "mes-cantidad", cantidad));

    const grilla = crearElemento("div", "mes-grilla");
    iniciales.forEach((inicial) => grilla.append(crearElemento("span", "dia-semana", inicial)));

    // Espacios vacíos antes del día 1, porque la semana empieza el lunes.
    const huecos = (new Date(anio, mes, 1).getDay() + 6) % 7;
    for (let i = 0; i < huecos; i++) grilla.append(crearElemento("span"));

    const dia = new Date(anio, mes, 1);
    while (dia.getMonth() === mes) {
      const texto = fechaATexto(dia);
      const personas = equipo ? quienesEstanDeVacaciones(dia) : [];
      const tipo = equipo ? tipoDeDiaEquipo(personas, texto) : tipoDeDia(dia, persona);
      const celda = crearElemento("span", "dia dia-" + tipo, dia.getDate());
      if (texto === hoy) celda.classList.add("dia-hoy");
      if (equipo && datos.coloresPorPersona && personas.length) pintarConColores(celda, personas, texto);

      // Al pasar el mouse se ve el nombre del festivo y, en la vista del equipo, quiénes están de vacaciones.
      const festivo = datos.festivos.find((f) => f.fecha === texto);
      const nombres = [];
      if (festivo && festivo.nombre) nombres.push(festivo.nombre);
      personas.forEach((empleado) => nombres.push(empleado.nombre || textos.sinNombre));
      if (nombres.length) celda.title = nombres.join(", ");

      grilla.append(celda);
      dia.setDate(dia.getDate() + 1);
    }

    const bloque = crearElemento("div", "mes");
    bloque.append(titulo, grilla);
    contenedor.append(bloque);
  }
}

// ---------- Imprimir ----------

// Al imprimir (con el botón o con Ctrl+P) sale solo el calendario; ver @media print en styles.css.
// Si estaba plegado, se abre para imprimir y después vuelve a como estaba.
let calendarioEstabaAbierto = true;

window.addEventListener("beforeprint", () => {
  const seccion = document.getElementById("seccion-calendario");
  calendarioEstabaAbierto = seccion.open;
  seccion.open = true;
});

window.addEventListener("afterprint", () => {
  document.getElementById("seccion-calendario").open = calendarioEstabaAbierto;
});

document.getElementById("boton-imprimir").addEventListener("click", () => window.print());

document.getElementById("ver-calendario").addEventListener("change", (evento) => {
  datos.calendarioPersona = Number(evento.target.value);
  guardarDatos();
  mostrarCalendario();
});

document.querySelectorAll("[name=coloresCalendario]").forEach((opcion) => {
  opcion.addEventListener("change", () => {
    datos.coloresPorPersona = opcion.value === "persona";
    guardarDatos();
    mostrarCalendario();
  });
});
