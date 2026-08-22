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


  function setJuriwellForms() {
    var forms = document.querySelectorAll("[data-jw-form]");
    if (!forms.length) return;

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    forms.forEach(function (form) {
      var input = form.querySelector("[data-jw-email]");
      var trap = form.querySelector("[data-jw-trap]");
      var button = form.querySelector("[data-jw-submit]");
      var status = form.querySelector("[data-jw-status]");
      var submitting = false;

      function say(message, tone) {
        if (!status) return;
        status.textContent = message;
        status.hidden = !message;
        status.setAttribute("data-tone", tone || "info");
      }

      function openWelcome() {
        var url = form.getAttribute("data-jw-welcome");
        if (!url) return;
        // Opened inside the submit handler's task so the popup blocker
        // still treats it as user-initiated.
        var opened = window.open(url, "_blank", "noopener");
        if (!opened) window.location.href = url;
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (submitting) return;

        // Honeypot: a filled hidden field means a bot. Fail silently.
        if (trap && trap.value) return;

        var email = input ? input.value.trim() : "";
        if (!emailRe.test(email)) {
          say(form.getAttribute("data-jw-msg-invalid"), "error");
          if (input) input.focus();
          return;
        }

        var endpoint = form.getAttribute("data-jw-endpoint");
        if (!endpoint) {
          // No lead endpoint configured yet — never dead-end the visitor.
          say(form.getAttribute("data-jw-msg-success"), "ok");
          openWelcome();
          return;
        }

        submitting = true;
        if (button) button.disabled = true;
        say(form.getAttribute("data-jw-msg-loading"), "info");

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            service: form.getAttribute("data-jw-service") || "immigration",
            source: form.getAttribute("data-jw-source") || "sga-guide",
            message: "Guide download request — " + (form.getAttribute("data-jw-topic") || "")
          })
        })
          .then(function (response) {
            if (!response.ok) throw new Error("lead endpoint returned " + response.status);
            say(form.getAttribute("data-jw-msg-success"), "ok");
            form.setAttribute("data-jw-done", "true");
            if (input) input.value = "";
            openWelcome();
          })
          .catch(function () {
            say(form.getAttribute("data-jw-msg-error"), "error");
          })
          .then(function () {
            submitting = false;
            if (button) button.disabled = false;
          });
      });
    });
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
  setJuriwellForms();
  window.addEventListener("scroll", setScrolled, { passive: true });
})();
