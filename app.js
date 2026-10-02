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

document.getElementById("boton-idioma").addEventListener("click", cambiarIdioma);
aplicarIdioma();
