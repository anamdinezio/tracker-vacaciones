// Pestañas: se ve un panel por vez. La página recuerda la última pestaña abierta.

const CLAVE_PESTANIA = "pestaniaV2";

function mostrarPestania(nombre) {
  document.querySelectorAll(".pestania").forEach((boton) => {
    boton.classList.toggle("activa", boton.dataset.pestania === nombre);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== nombre;
  });
  try {
    localStorage.setItem(CLAVE_PESTANIA, nombre);
  } catch (error) {
    // Si no se puede guardar, funciona igual hasta recargar.
  }
}

document.querySelectorAll(".pestania").forEach((boton) => {
  boton.addEventListener("click", () => mostrarPestania(boton.dataset.pestania));
});

// Al entrar se abre la última pestaña usada; la primera vez, "Equipo".
let pestaniaInicial = "equipo";
try {
  const guardada = localStorage.getItem(CLAVE_PESTANIA);
  if (document.querySelector(`[data-panel="${guardada}"]`)) pestaniaInicial = guardada;
} catch (error) {
  // Si no se puede leer, arranca en "Equipo".
}
mostrarPestania(pestaniaInicial);
