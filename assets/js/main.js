(function () {
  var body = document.body;
  var nav = document.querySelector(".nav");
  var menuToggle = document.querySelector("[data-menu-toggle]");
  var mobilePanel = document.querySelector("[data-mobile-panel]");

  function setScrolled() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 20);
  }

  function setRevealObserver() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-in");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function setPersonaTabs() {
    var triggers = document.querySelectorAll("[data-persona-trigger]");
    var panels = document.querySelectorAll("[data-persona-panel]");

    if (!triggers.length || !panels.length) return;

    function activate(id) {
      triggers.forEach(function (trigger) {
        var active = trigger.getAttribute("data-persona-trigger") === id;
        trigger.classList.toggle("active", active);
        trigger.setAttribute("aria-pressed", active ? "true" : "false");
      });

      panels.forEach(function (panel) {
        var active = panel.getAttribute("data-persona-panel") === id;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        activate(trigger.getAttribute("data-persona-trigger"));
      });
    });
  }

  function setAccordions() {
    var groups = document.querySelectorAll("[data-accordion]");

    function setState(item, open) {
      var button = item.querySelector("[data-accordion-button]");
      var panel = item.querySelector("[data-accordion-panel]");

      if (!button || !panel) return;

      item.classList.toggle("open", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      panel.style.maxHeight = open ? panel.scrollHeight + "px" : "0px";
    }

    groups.forEach(function (group) {
      var items = group.querySelectorAll("[data-accordion-item]");
      items.forEach(function (item) {
        setState(item, item.hasAttribute("data-open-default"));

        var button = item.querySelector("[data-accordion-button]");
        if (!button) return;

        button.addEventListener("click", function () {
          var willOpen = button.getAttribute("aria-expanded") !== "true";
          items.forEach(function (other) {
            setState(other, false);
          });
          if (willOpen) {
            setState(item, true);
          }
        });
      });
    });

    window.addEventListener("resize", function () {
      document.querySelectorAll("[data-accordion-item].open").forEach(function (item) {
        var panel = item.querySelector("[data-accordion-panel]");
        if (panel) {
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
    });
  }

  function setHomeSectionTracking() {
    if (!body || body.getAttribute("data-page") !== "home") return;

    var ids = ["top", "fit", "personas", "services", "pathways", "investment", "relocation", "process", "consultation", "faq", "contact"];
    var map = {
      services: "services",
      pathways: "pathways",
      investment: "services",
      relocation: "services",
      process: "process",
      consultation: "process",
      faq: "faq",
      contact: "faq"
    };
    var links = document.querySelectorAll("[data-nav-key]");

    function updateActiveLink() {
      var scroll = window.scrollY + 150;
      var current = "";

      ids.forEach(function (id) {
        var section = document.getElementById(id);
        if (section && section.offsetTop <= scroll) {
          current = map[id] || "";
        }
      });

      links.forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("data-nav-key") === current);
      });
    }

    updateActiveLink();
    window.addEventListener("scroll", updateActiveLink, { passive: true });
  }

  function setMobileMenu() {
    if (!menuToggle || !mobilePanel) return;

    function closeMenu() {
      menuToggle.setAttribute("aria-expanded", "false");
      mobilePanel.hidden = true;
      body.classList.remove("menu-open");
    }

    function openMenu() {
      menuToggle.setAttribute("aria-expanded", "true");
      mobilePanel.hidden = false;
      body.classList.add("menu-open");
    }

    menuToggle.addEventListener("click", function () {
      if (menuToggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
      } else {
        openMenu();
      }
    });

    mobilePanel.querySelectorAll("[data-mobile-link]").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) {
        closeMenu();
      }
    });
  }

  setScrolled();
  setRevealObserver();
  setPersonaTabs();
  setAccordions();
  setHomeSectionTracking();
  setMobileMenu();
  window.addEventListener("scroll", setScrolled, { passive: true });
})();
