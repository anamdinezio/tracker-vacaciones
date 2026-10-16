// Calendario anual con colores y gráfico de días de vacaciones por mes.
// Usa las funciones y los datos de app.js (se llaman cuando la página ya cargó todo).

// El calendario se puede ver para todo el equipo o solo para la persona elegida.
function vistaDeEquipo() {
  return datos.vistaCalendario !== "persona";
}

// Nombres de las personas que tienen ese día de vacaciones (solo los días que se descuentan).
function quienesEstanDeVacaciones(fecha) {
  const texto = fechaATexto(fecha);
  return datos.empleados
    .filter((empleado) =>
      empleado.periodos.some((periodo) => texto >= periodo.desde && texto <= periodo.hasta) &&
      cuentaComoVacaciones(fecha, empleado)
    )
    .map((empleado) => empleado.nombre || TEXTOS[idioma].sinNombre);
}

// Vista del equipo: vacaciones si hay una persona, solape si hay dos o más.
function tipoDeDiaEquipo(fecha) {
  const cantidad = quienesEstanDeVacaciones(fecha).length;
  if (cantidad >= 2) return "solape";
  if (cantidad === 1) return "vacaciones";
  if (esFestivo(fechaATexto(fecha))) return "festivo";
  return "laborable";
}

// Vista de una persona: qué tipo de día es, para elegir el color en el calendario.
function tipoDeDia(fecha) {
  const texto = fechaATexto(fecha);
  if (!estaDentroDelContrato(texto)) return "fuera";

  const enVacaciones = empleadoActual().periodos.some((periodo) => texto >= periodo.desde && texto <= periodo.hasta);
  if (enVacaciones && cuentaComoVacaciones(fecha)) return "vacaciones";
  if (esFestivo(texto)) return "festivo";
  if (!trabajaEseDia(fecha)) return "no-laborable";
  return "laborable";
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
function diasDeVacacionesPorMes() {
  const porMes = new Array(12).fill(0);
  empleadoActual().periodos.forEach((periodo) => {
    recorrerPeriodo(periodo, (fecha) => {
      if (cuentaComoVacaciones(fecha)) porMes[fecha.getMonth()]++;
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
  const equipo = vistaDeEquipo();
  // En la hoja impresa el título lleva también el nombre de la persona, o "Todo el equipo".
  const nombreImpreso = equipo ? textos.todoElEquipo : empleadoActual().nombre;
  if (nombreImpreso) {
    titulo.append(crearElemento("span", "solo-impresion", " · " + nombreImpreso));
  }

  // Opciones de vista y leyenda: algunas solo tienen sentido en una de las dos vistas.
  document.querySelector(`[name=vistaCalendario][value=${equipo ? "equipo" : "persona"}]`).checked = true;
  document.getElementById("vista-persona").textContent = textos.soloPersona.replace(
    "{nombre}",
    empleadoActual().nombre || textos.sinNombre
  );
  document.querySelectorAll(".solo-vista-equipo").forEach((elemento) => (elemento.hidden = !equipo));
  document.querySelectorAll(".solo-vista-persona").forEach((elemento) => (elemento.hidden = equipo));

  if (!anio) return; // sin año no hay calendario

  const porMes = diasDeVacacionesPorMes();
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
      const tipo = equipo ? tipoDeDiaEquipo(dia) : tipoDeDia(dia);
      const celda = crearElemento("span", "dia dia-" + tipo, dia.getDate());
      if (texto === hoy) celda.classList.add("dia-hoy");

      // Al pasar el mouse se ve el nombre del festivo y, en la vista del equipo, quiénes están de vacaciones.
      const festivo = datos.festivos.find((f) => f.fecha === texto);
      const nombres = [];
      if (festivo && festivo.nombre) nombres.push(festivo.nombre);
      if (equipo) nombres.push(...quienesEstanDeVacaciones(dia));
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

document.querySelectorAll("[name=vistaCalendario]").forEach((opcion) => {
  opcion.addEventListener("change", () => {
    datos.vistaCalendario = opcion.value;
    guardarDatos();
    mostrarCalendario();
  });
});
