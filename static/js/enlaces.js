/**
 * Lógica para mover la línea azul del Navbar
 */
function moverIndicador(elemento) {
  const indicador = document.getElementById("nav-indicator");
  if (elemento && indicador) {
    indicador.style.left = elemento.offsetLeft + "px";
    indicador.style.width = elemento.offsetWidth + "px";
  }
}

/**
 * FUNCIÓN MAESTRA DE ANIMACIONES (Intersection Observer)
 */
function activarAnimacionesScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Forzamos la visibilidad y posición original
        entry.target.classList.add('opacity-100', 'translate-y-0');
        entry.target.classList.remove('opacity-0', 'translate-y-20');
      }
    });
  }, { threshold: 0.1 });

  // Seleccionamos secciones, divs de servicios y las cards
  const elementosParaAnimar = document.querySelectorAll('#contenido section > div, #contenido .py-32 > div, #contenido .service-card');

  elementosParaAnimar.forEach(el => {
    // Estado inicial para que la animación funcione al hacer scroll
    el.classList.add('transition-all', 'duration-1000', 'opacity-0', 'translate-y-20');
    observer.observe(el);
  });
}

/**
 * Lógica para cargar contenido dinámico
 */
function cargarSeccion(pagina, linkElement) {
  const contenedor = document.getElementById("contenido");

  // Transición de salida suave
  contenedor.style.opacity = "0";
  contenedor.style.transform = "translateY(10px)";

  setTimeout(() => {
    fetch(pagina)
      .then(response => response.text())
      .then(html => {
        // Inyectar el HTML
        contenedor.innerHTML = html;

        // Reset de posición
        contenedor.style.opacity = "1";
        contenedor.style.transform = "translateY(0)";
        window.scrollTo(0, 0);

        // 🔥 PASO CLAVE: Re-activar animaciones y eventos de cards
        activarAnimacionesScroll();
        rebindServiceCards();

        // Actualizar Navbar
        if (linkElement) {
          document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
          linkElement.classList.add("active");
          moverIndicador(linkElement);
        }
      })
      .catch(error => console.warn("Error al cargar:", error));
  }, 300);
}

/**
 * Re-vincula el evento click a las tarjetas de servicio si existen
 */
function rebindServiceCards() {
  const cards = document.querySelectorAll(".service-card");
  cards.forEach(card => {
    card.onclick = function () {
      cards.forEach(c => c.classList.remove("active"));
      this.classList.add("active");
    };
  });
}

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
  const inicioLink = document.querySelector(".nav-link.active");
  moverIndicador(inicioLink);
  // Cargamos la página inicial
  cargarSeccion('inicio.html', inicioLink);
});

window.addEventListener("resize", () => {
  const activeLink = document.querySelector(".nav-link.active");
  moverIndicador(activeLink);
});