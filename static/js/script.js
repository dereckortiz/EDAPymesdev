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

// 🔥 FUNCIÓN PRINCIPAL (IMPORTANTE)
function iniciarTodo() {

  // =========================
  // 🎥 CARRUSEL
  // =========================

  const slides = document.querySelectorAll('.slide');
  const contents = document.querySelectorAll('.slide-content');
  const video = document.getElementById('videoSlide');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  // 🔥 Si no existe el carrusel, salir (evita errores en otras páginas)
  if (!slides.length) return;

  let current = 0;
  let interval = null;
  let started = false;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.remove('active');
      contents[i].classList.remove('active');

      if (i === index) {
        slide.classList.add('active');
        contents[i].classList.add('active');
      }
    });
  }

  function nextSlide() {
    current = (current + 1) % slides.length;
    showSlide(current);
  }

  function prevSlide() {
    current = (current - 1 + slides.length) % slides.length;
    showSlide(current);
  }

  function startCarousel() {
    if (started) return;
    started = true;
    interval = setInterval(nextSlide, 7000);
  }

  // 🎥 video
  if (video) {
    video.addEventListener('ended', () => {
      nextSlide();
      startCarousel();
    });
  }

  // botones carrusel
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);

  // =========================
  // 🎯 BOTONES DEL HERO (CATÁLOGO / SERVICIOS)
  // =========================

  const botonesCatalogo = document.querySelectorAll(".btn-catalogo");
  const botonesServicios = document.querySelectorAll(".btn-servicios");

  botonesCatalogo.forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = document.querySelectorAll(".nav-link")[2];
      cargarSeccion("Catalogo.html", nav);
    });
  });

  botonesServicios.forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = document.querySelectorAll(".nav-link")[1];
      cargarSeccion("servicios.html", nav);
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

      // 🔥 opcional: redirigir a servicios
      const nav = document.querySelectorAll(".nav-link")[1];
      cargarSeccion("servicios.html", nav);
    });
  });

}

// 🔥 HACER GLOBAL
window.iniciarTodo = iniciarTodo;
document.addEventListener("DOMContentLoaded", () => {
  activarBotonesInicio();
});