tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "#0769D2",
        "primary-hover": "#133C6F",
        secondary: "#5985BD",

        background: "#FFFFFF",
        "background-soft": "#F4F7FB",

        surface: "#FFFFFF",
        "surface-variant": "#F8FAFC",

        "on-primary": "#FFFFFF",
        "on-surface": "#0C1F41",
        "on-surface-variant": "#6B7280",

        outline: "#E5E7EB"
      },
      fontFamily: {
        headline: ["Manrope"],
        body: ["Inter"]
      }
    }
  }
};

// 🔥 FUNCIÓN PRINCIPAL DEL CARRUSEL
function iniciarTodo() {

  // =========================
  // 🎥 CARRUSEL MEJORADO
  // =========================

  const slides = document.querySelectorAll('.slide');
  const contents = document.querySelectorAll('.slide-content');
  const video = document.getElementById('videoSlide');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  // Si no existe el carrusel, salir
  if (!slides.length) return;

  let current = 0;
  let interval = null;
  let videoEnded = false; // Controlar si el video ya terminó
  let autoPlayEnabled = false; // Controlar autoplay después del video

  // Función para mostrar un slide específico
  function showSlide(index) {
    // Ocultar todos los slides y contenidos
    slides.forEach((slide, i) => {
      slide.classList.remove('active');
      if (contents[i]) {
        contents[i].classList.remove('active');
      }

      // Pausar el video si no es el slide actual
      if (slide.tagName === 'VIDEO' && i !== index) {
        slide.pause();
      }
    });

    // Mostrar el slide actual
    slides[index].classList.add('active');
    if (contents[index]) {
      contents[index].classList.add('active');
    }

    // Si es el video y no ha terminado, reproducirlo
    if (slides[index].tagName === 'VIDEO' && !videoEnded) {
      slides[index].play();
    }
  }

  // Función para siguiente slide
  function nextSlide() {
    current = (current + 1) % slides.length;
    showSlide(current);

    // Si estamos en el video y ya terminó, desactivar autoplay
    if (slides[current].tagName === 'VIDEO' && videoEnded) {
      if (autoPlayEnabled && interval) {
        clearInterval(interval);
        autoPlayEnabled = false;
      }
    }
  }

  // Función para anterior slide
  function prevSlide() {
    current = (current - 1 + slides.length) % slides.length;
    showSlide(current);

    // Si retrocedemos al video y ya terminó, no autoplay
    if (slides[current].tagName === 'VIDEO' && videoEnded) {
      if (autoPlayEnabled && interval) {
        clearInterval(interval);
        autoPlayEnabled = false;
      }
    }
  }

  // Función para iniciar autoplay de imágenes
  function startAutoPlay() {
    if (autoPlayEnabled) return;
    autoPlayEnabled = true;
    interval = setInterval(() => {
      // Solo avanzar si no estamos en el video
      if (slides[current].tagName !== 'VIDEO') {
        nextSlide();
      }
    }, 5000); // Cambia cada 5 segundos
  }

  // Configurar el video
  if (video) {
    video.addEventListener('ended', () => {
      videoEnded = true;
      // Cuando termina el video, pasar a la primera imagen
      current = 1; // La primera imagen después del video
      showSlide(current);
      // Iniciar autoplay para las imágenes
      startAutoPlay();
    });

    // Asegurar que el video se reproduce al inicio
    video.play();
  }

  // Eventos para los botones de navegación
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      // Reiniciar el autoplay si está activo
      if (autoPlayEnabled) {
        clearInterval(interval);
        interval = setInterval(() => {
          if (slides[current].tagName !== 'VIDEO') {
            nextSlide();
          }
        }, 5000);
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      // Reiniciar el autoplay si está activo
      if (autoPlayEnabled) {
        clearInterval(interval);
        interval = setInterval(() => {
          if (slides[current].tagName !== 'VIDEO') {
            nextSlide();
          }
        }, 5000);
      }
    });
  }

  // =========================
  // 🎯 BOTONES DEL HERO (CATÁLOGO / SERVICIOS)
  // =========================

  const botonesCatalogo = document.querySelectorAll(".btn-catalogo");
  const botonesServicios = document.querySelectorAll(".btn-servicios");

  botonesCatalogo.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const nav = document.querySelectorAll(".nav-link")[2];
      if (typeof cargarSeccion === "function") {
        cargarSeccion("Catalogo.html", nav);
      } else {
        window.location.href = "Catalogo.html";
      }
    });
  });

  botonesServicios.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const nav = document.querySelectorAll(".nav-link")[1];
      if (typeof cargarSeccion === "function") {
        cargarSeccion("servicios.html", nav);
      } else {
        window.location.href = "servicios.html";
      }
    });
  });

  // =========================
  // 💡 CARDS SERVICIOS (ANIMACIÓN)
  // =========================

  const cards = document.querySelectorAll(".service-card");

  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");

      // Redirigir a servicios
      const nav = document.querySelectorAll(".nav-link")[1];
      if (typeof cargarSeccion === "function") {
        cargarSeccion("servicios.html", nav);
      } else {
        window.location.href = "servicios.html";
      }
    });
  });
}

// 🔥 HACER GLOBAL
window.iniciarTodo = iniciarTodo;

// Esperar a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  iniciarTodo();
  if (typeof activarBotonesInicio === "function") {
    activarBotonesInicio();
  }
});

// Función para ir al inicio y bajar hasta contacto
function irAInicioYContacto() {
  // 1. Buscamos el enlace de "Inicio" en tu menú (índice 0)
  const navInicio = document.querySelectorAll(".nav-link")[0];

  // 2. Cargamos inicio.html y le pasamos el nav para que mueva la línea azul
  if (typeof cargarSeccion === "function") {
    cargarSeccion("inicio.html", navInicio);

    // 3. Esperamos un poco a que cargue el contenido para hacer el scroll
    setTimeout(() => {
      const seccionContacto = document.getElementById('contacto');
      if (seccionContacto) {
        seccionContacto.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  }
}

// Hacerla global para que el botón la encuentre
window.irAInicioYContacto = irAInicioYContacto;