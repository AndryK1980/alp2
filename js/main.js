function initBurgerMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  const mainMenu = document.getElementById("main-menu");

  if (!menuToggle || !mainMenu) {
    return;
  }

  const icon = menuToggle.querySelector("i");

  function setMenuState(isOpen) {
    mainMenu.classList.toggle("hidden", !isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");

    if (icon) {
      icon.classList.toggle("fa-bars", !isOpen);
      icon.classList.toggle("fa-xmark", isOpen);
    }
  }

  // Align runtime state with initial DOM attributes/classes.
  setMenuState(false);

  menuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  mainMenu.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("a[href^='#']")) {
      setMenuState(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!mainMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      setMenuState(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuState(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 640) {
      setMenuState(false);
    }
  });
}

function initSmoothScroll() {
  const heroCta = document.getElementById("hero-cta");
  const formSection = document.getElementById("form");

  if (heroCta && formSection) {
    heroCta.addEventListener("click", () => {
      formSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const formAnchorLinks = document.querySelectorAll("a[href='#form']");

  formAnchorLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initBurgerMenu();
  initSmoothScroll();
});
