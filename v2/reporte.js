// Reporte de una persona para guardar en PDF y mandárselo: resumen del año, períodos y calendario.
// Se arma en la sección #reporte, que solo se ve al imprimir. En la ventana de imprimir
// se elige "Guardar como PDF".
// Usa las funciones de app.js y calendario.js (se llaman cuando la página ya cargó todo).

// Un número grande con su texto debajo, como las tarjetas del resumen.
function crearIndicadorDeReporte(numero, texto, detalle) {
  const indicador = crearElemento("div", "indicador");
  indicador.append(crearElemento("span", "indicador-numero", numero), crearElemento("span", "", texto));
  if (detalle) indicador.append(crearElemento("span", "indicador-detalle", detalle));
  return indicador;
}

function armarReporte(empleado) {
  const textos = TEXTOS[idioma];
  const reporte = document.getElementById("reporte");
  reporte.innerHTML = "";
  const saldo = calcularSaldo(empleado);
  const arrastrados = Number(empleado.diasArrastrados);

  // Encabezado: año, persona y fecha del reporte.
  reporte.append(
    crearElemento("h1", "", textos.reporteTitulo.replace("{anio}", datos.anio)),
    crearElemento("p", "", [empleado.nombre, empleado.mail].filter(Boolean).join(" · ")),
    crearElemento("p", "aclaracion", textos.reporteGenerado.replace("{fecha}", formatearFecha(fechaATexto(new Date()))))
  );

  // Resumen.
  const indicadores = crearElemento("div", "indicadores");
  indicadores.append(
    crearIndicadorDeReporte(
      saldo.faltanDias ? "—" : saldo.totalDias,
      textos.totalDias,
      arrastrados > 0 ? textos.incluyeArrastrados.replace("{n}", arrastrados) : ""
    ),
    crearIndicadorDeReporte(saldo.diasUsados, textos.diasUsados),
    crearIndicadorDeReporte(saldo.diasPendientes, textos.diasPendientes),
    crearIndicadorDeReporte(saldo.faltanDias ? "—" : saldo.diasDisponibles, textos.diasDisponibles)
  );
  reporte.append(crearElemento("h2", "", textos.resumen), indicadores);

  // Períodos, con su estado.
  const tabla = crearElemento("table", "reporte-tabla");
  const encabezado = crearElemento("tr");
  [textos.desde, textos.hasta, textos.columnaDias, textos.columnaEstado].forEach((titulo) =>
    encabezado.append(crearElemento("th", "", titulo))
  );
  tabla.append(encabezado);
  empleado.periodos.forEach((periodo) => {
    const fila = crearElemento("tr");
    fila.append(
      crearElemento("td", "", formatearFecha(periodo.desde)),
      crearElemento("td", "", formatearFecha(periodo.hasta)),
      crearElemento("td", "", contarDiasDeVacaciones(periodo, empleado)),
      crearElemento("td", "", textos["estado_" + estadoDe(periodo)])
    );
    tabla.append(fila);
  });
  reporte.append(crearElemento("h2", "", textos.periodosVacaciones), tabla);

  // Calendario del año, en una hoja nueva, con su leyenda.
  const bloqueCalendario = crearElemento("div", "reporte-calendario");
  const leyenda = crearElemento("div", "leyenda");
  [
    ["dia-vacaciones", textos.leyendaVacaciones],
    ["dia-pendiente", textos.leyendaPendiente],
    ["dia-festivo", textos.leyendaFestivo],
    ["dia-no-laborable", textos.leyendaNoLaborable],
  ].forEach(([clase, texto]) => {
    const muestra = crearElemento("span");
    muestra.append(crearElemento("i", "muestra " + clase), crearElemento("span", "", texto));
    leyenda.append(muestra);
  });
  const calendario = crearElemento("div", "calendario");
  dibujarMeses(calendario, empleado);
  bloqueCalendario.append(
    crearElemento("h2", "", textos.calendario.replace("{anio}", datos.anio) + " · " + empleado.nombre),
    leyenda,
    calendario
  );
  reporte.append(bloqueCalendario);
}

// Arma el reporte y abre la ventana de imprimir. El título de la página se usa como nombre del PDF.
function imprimirReporte(empleado) {
  armarReporte(empleado);
  const tituloAnterior = document.title;
  const nombre = (empleado.nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca los acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  document.title = [TEXTOS[idioma].nombreReporte, nombre, datos.anio].filter(Boolean).join("-");
  document.body.classList.add("imprimiendo-reporte");

  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("imprimiendo-reporte");
      document.title = tituloAnterior;
    },
    { once: true }
  );
  window.print();
}

document.getElementById("boton-reporte").addEventListener("click", () => imprimirReporte(empleadoActual()));
