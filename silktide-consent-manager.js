// Silktide Consent Manager - https://silktide.com/consent-manager/

class SilktideCookieBanner {
  constructor(config) {
    this.config = config; // Save config to the instance

    this.wrapper = null;
    this.banner = null;
    this.modal = null;
    this.cookieIcon = null;
    this.backdrop = null;

    this.createWrapper();

    if (this.shouldShowBackdrop()) {
      this.createBackdrop();
    }

    this.createCookieIcon();
    this.createModal();

    if (this.shouldShowBanner()) {
      this.createBanner();
      this.showBackdrop();
    } else {
      this.showCookieIcon();
    }

    this.setupEventListeners();

    if (this.hasSetInitialCookieChoices()) {
      this.loadRequiredCookies();
      this.runAcceptedCookieCallbacks();
    }
  }

  destroyCookieBanner() {
    // Remove all cookie banner elements from the DOM
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }

    // Restore scrolling
    this.allowBodyScroll();

    // Clear all references
    this.wrapper = null;
    this.banner = null;
    this.modal = null;
    this.cookieIcon = null;
    this.backdrop = null;
  }

  // ----------------------------------------------------------------
  // Wrapper
  // ----------------------------------------------------------------
  createWrapper() {
    this.wrapper = document.createElement("div");
    this.wrapper.id = "silktide-wrapper";
    document.body.insertBefore(this.wrapper, document.body.firstChild);
  }

  createWrapperChild(htmlContent, id) {
    // Create child element
    const child = document.createElement("div");
    child.id = id;
    child.innerHTML = htmlContent;

    // Ensure wrapper exists
    if (!this.wrapper || !document.body.contains(this.wrapper)) {
      this.createWrapper();
    }

    // Append child to wrapper
    this.wrapper.appendChild(child);
    return child;
  }

  // ----------------------------------------------------------------
  // Backdrop
  // ----------------------------------------------------------------
  createBackdrop() {
    this.backdrop = this.createWrapperChild(null, "silktide-backdrop");
  }

  showBackdrop() {
    if (this.backdrop) {
      this.backdrop.style.display = "block";
    }
    if (typeof this.config.onBackdropOpen === "function") {
      this.config.onBackdropOpen();
    }
  }

  hideBackdrop() {
    if (this.backdrop) {
      this.backdrop.style.display = "none";
    }
    if (typeof this.config.onBackdropClose === "function") {
      this.config.onBackdropClose();
    }
  }

  shouldShowBackdrop() {
    return this.config?.background?.showBackground || false;
  }

  // ----------------------------------------------------------------
  // Consent Handling & Storage
  // ----------------------------------------------------------------
  updateCheckboxState(saveToStorage = false) {
    const preferencesSection = this.modal.querySelector("#cookie-preferences");
    const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      const [, cookieId] = checkbox.id.split("cookies-");
      const cookieType = this.config.cookieTypes.find((type) => type.id === cookieId);
      if (!cookieType) return;

      if (saveToStorage) {
        const currentState = checkbox.checked;
        if (cookieType.required) {
          localStorage.setItem(`cookieConsent_${cookieId}${this.getBannerSuffix()}`, "true");
        } else {
          localStorage.setItem(
            `cookieConsent_${cookieId}${this.getBannerSuffix()}`,
            currentState.toString()
          );
          if (currentState && typeof cookieType.onAccept === "function") {
            cookieType.onAccept();
          } else if (!currentState && typeof cookieType.onReject === "function") {
            cookieType.onReject();
          }
        }
      } else {
        if (cookieType.required) {
          checkbox.checked = true;
          checkbox.disabled = true;
        } else {
          const storedValue = localStorage.getItem(
            `cookieConsent_${cookieId}${this.getBannerSuffix()}`
          );
          if (storedValue !== null) {
            checkbox.checked = storedValue === "true";
          } else {
            checkbox.checked = !!cookieType.defaultValue;
          }
        }
      }
    });
  }

  setInitialCookieChoiceMade() {
    window.localStorage.setItem(`cookieConsent_InitialChoice${this.getBannerSuffix()}`, 1);
  }

  handleCookieChoice(accepted) {
    this.setInitialCookieChoiceMade();
    this.removeBanner();
    this.hideBackdrop();
    this.toggleModal(false);
    this.showCookieIcon();

    this.config.cookieTypes.forEach((type) => {
      if (type.required === true) {
        localStorage.setItem(`cookieConsent_${type.id}${this.getBannerSuffix()}`, "true");
        if (typeof type.onAccept === "function") type.onAccept();
      } else {
        localStorage.setItem(
          `cookieConsent_${type.id}${this.getBannerSuffix()}`,
          accepted.toString()
        );
        if (accepted) {
          if (typeof type.onAccept === "function") type.onAccept();
        } else {
          if (typeof type.onReject === "function") type.onReject();
        }
      }
    });

    if (accepted && typeof this.config.onAcceptAll === "function") {
      this.config.onAcceptAll();
    } else if (!accepted && typeof this.config.onRejectAll === "function") {
      this.config.onRejectAll();
    }

    this.updateCheckboxState();
  }

  getAcceptedCookies() {
    return (this.config.cookieTypes || []).reduce((acc, cookieType) => {
      acc[cookieType.id] =
        localStorage.getItem(`cookieConsent_${cookieType.id}${this.getBannerSuffix()}`) ===
        "true";
      return acc;
    }, {});
  }

  runAcceptedCookieCallbacks() {
    if (!this.config.cookieTypes) return;
    const acceptedCookies = this.getAcceptedCookies();
    this.config.cookieTypes.forEach((type) => {
      if (type.required) return;
      if (acceptedCookies[type.id] && typeof type.onAccept === "function") {
        type.onAccept();
      }
    });
  }

  runRejectedCookieCallbacks() {
    if (!this.config.cookieTypes) return;
    const rejectedCookies = this.getRejectedCookies();
    this.config.cookieTypes.forEach((type) => {
      if (rejectedCookies[type.id] && typeof type.onReject === "function") {
        type.onReject();
      }
    });
  }

  runStoredCookiePreferenceCallbacks() {
    this.config.cookieTypes.forEach((type) => {
      const accepted =
        localStorage.getItem(`cookieConsent_${type.id}${this.getBannerSuffix()}`) === "true";
      if (accepted) {
        if (typeof type.onAccept === "function") type.onAccept();
      } else {
        if (typeof type.onReject === "function") type.onReject();
      }
    });
  }

  loadRequiredCookies() {
    if (!this.config.cookieTypes) return;
    this.config.cookieTypes.forEach((cookie) => {
      if (cookie.required && typeof cookie.onAccept === "function") {
        cookie.onAccept();
      }
    });
  }

  // ----------------------------------------------------------------
  // Banner
  // ----------------------------------------------------------------
  getBannerContent() {
    const bannerDescription =
      this.config.text?.banner?.description ||
      `We use cookies on our site to enhance your user experience, provide personalized content, and analyze our traffic.`;

    const acceptAllButtonText = this.config.text?.banner?.acceptAllButtonText || "Accept all";
    const acceptAllButtonLabel = this.config.text?.banner?.acceptAllButtonAccessibleLabel;
    const acceptAllButton = `<button class="accept-all st-button st-button--primary"${
      acceptAllButtonLabel && acceptAllButtonLabel !== acceptAllButtonText
        ? ` aria-label="${acceptAllButtonLabel}"`
        : ""
    }>${acceptAllButtonText}</button>`;

    const rejectNonEssentialButtonText =
      this.config.text?.banner?.rejectNonEssentialButtonText || "Reject non-essential";
    const rejectNonEssentialButtonLabel =
      this.config.text?.banner?.rejectNonEssentialButtonAccessibleLabel;
    const rejectNonEssentialButton = `<button class="reject-all st-button st-button--secondary"${
      rejectNonEssentialButtonLabel &&
      rejectNonEssentialButtonLabel !== rejectNonEssentialButtonText
        ? ` aria-label="${rejectNonEssentialButtonLabel}"`
        : ""
    }>${rejectNonEssentialButtonText}</button>`;

    const preferencesButtonText = this.config.text?.banner?.preferencesButtonText || "Preferences";
    const preferencesButtonLabel = this.config.text?.banner?.preferencesButtonAccessibleLabel;
    const preferencesButton = `<button class="preferences"${
      preferencesButtonLabel && preferencesButtonLabel !== preferencesButtonText
        ? ` aria-label="${preferencesButtonLabel}"`
        : ""
    }><span>${preferencesButtonText}</span></button>`;

    const bannerContent = `
      ${bannerDescription}
      <div class="actions">
        ${rejectNonEssentialButton}
        ${acceptAllButton}
        <div class="actions-row">
          ${preferencesButton}
        </div>
      </div>
    `;

    return bannerContent;
  }

  hasSetInitialCookieChoices() {
    return !!localStorage.getItem(`cookieConsent_InitialChoice${this.getBannerSuffix()}`);
  }

  createBanner() {
    this.banner = this.createWrapperChild(this.getBannerContent(), "silktide-banner");
    if (this.banner && this.config.position?.banner) {
      this.banner.classList.add(this.config.position.banner);
    }
    if (this.banner && typeof this.config.onBannerOpen === "function") {
      this.config.onBannerOpen();
    }
  }

  removeBanner() {
    if (this.banner && this.banner.parentNode) {
      this.banner.parentNode.removeChild(this.banner);
      this.banner = null;
      if (typeof this.config.onBannerClose === "function") {
        this.config.onBannerClose();
      }
    }
  }

  shouldShowBanner() {
    if (this.config.showBanner === false) return false;
    return (
      localStorage.getItem(`cookieConsent_InitialChoice${this.getBannerSuffix()}`) === null
    );
  }

  // ----------------------------------------------------------------
  // Modal
  // ----------------------------------------------------------------

  // === CHANGED: Only one footer button "Bevestig" ===
  getModalContent() {
    const preferencesTitle =
      this.config.text?.preferences?.title || "Kies je privacy voorkeuren";

    const preferencesDescription =
      this.config.text?.preferences?.description || "<p></p>";

    const preferencesButtonLabel =
      this.config.text?.banner?.preferencesButtonAccessibleLabel;

    const closeModalButton = `<button class="modal-close"${
      preferencesButtonLabel ? ` aria-label="${preferencesButtonLabel}"` : ""
    }>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <path d="M19.4081 3.41559C20.189 2.6347 … Z"/>
      </svg>
    </button>`;

    const cookieTypes = this.config.cookieTypes || [];
    const acceptedCookieMap = this.getAcceptedCookies();
    const fieldsHtml = cookieTypes
      .map((type) => {
        const accepted = acceptedCookieMap[type.id];
        let isChecked = false;
        if (accepted) {
          isChecked = true;
        }
        if (!accepted && !this.hasSetInitialCookieChoices()) {
          isChecked = type.defaultValue;
        }
        return `
          <fieldset>
            <legend>${type.name}</legend>
            <div class="cookie-type-content">
              <div class="cookie-type-description">${type.description}</div>
              <label class="switch" for="cookies-${type.id}">
                <input type="checkbox" id="cookies-${type.id}" ${
          type.required ? "checked disabled" : isChecked ? "checked" : ""
        } />
                <span class="switch__pill" aria-hidden="true"></span>
                <span class="switch__dot" aria-hidden="true"></span>
                <span class="switch__off" aria-hidden="true">Off</span>
                <span class="switch__on" aria-hidden="true">On</span>
              </label>
            </div>
          </fieldset>
        `;
      })
      .join("");

    // Single confirm button
    const modalContent = `
      <header>
        <h1>${preferencesTitle}</h1>
        ${closeModalButton}
      </header>
      ${preferencesDescription}
      <section id="cookie-preferences">
        ${fieldsHtml}
      </section>
      <footer>
        <button class="preferences-confirm st-button st-button--primary">
          Bevestig
        </button>
      </footer>
    `;

    return modalContent;
  }

  createModal() {
    this.modal = this.createWrapperChild(this.getModalContent(), "silktide-modal");
  }

  toggleModal(show) {
    if (!this.modal) return;

    this.modal.style.display = show ? "flex" : "none";

    if (show) {
      this.showBackdrop();
      this.hideCookieIcon();
      this.removeBanner();
      this.preventBodyScroll();
      const modalCloseButton = this.modal.querySelector(".modal-close");
      modalCloseButton.focus();
      if (typeof this.config.onPreferencesOpen === "function") {
        this.config.onPreferencesOpen();
      }
      this.updateCheckboxState(false);
    } else {
      this.setInitialCookieChoiceMade();
      this.updateCheckboxState(true);
      this.hideBackdrop();
      this.showCookieIcon();
      this.allowBodyScroll();
      if (typeof this.config.onPreferencesClose === "function") {
        this.config.onPreferencesClose();
      }
    }
  }

  // ----------------------------------------------------------------
  // Cookie Icon
  // ----------------------------------------------------------------
  getCookieIconContent() {
    return `
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <path d="M19.1172 1.15625 … Z" />
      </svg>
    `;
  }

  createCookieIcon() {
    this.cookieIcon = document.createElement("button");
    this.cookieIcon.id = "silktide-cookie-icon";
    this.cookieIcon.innerHTML = this.getCookieIconContent();
    if (this.config.text?.banner?.preferencesButtonAccessibleLabel) {
      this.cookieIcon.ariaLabel = this.config.text?.banner?.preferencesButtonAccessibleLabel;
    }
    if (!this.wrapper || !document.body.contains(this.wrapper)) {
      this.createWrapper();
    }
    this.wrapper.appendChild(this.cookieIcon);
    if (this.cookieIcon && this.config.cookieIcon?.position) {
      this.cookieIcon.classList.add(this.config.cookieIcon.position);
    }
    if (this.cookieIcon && this.config.cookieIcon?.colorScheme) {
      this.cookieIcon.classList.add(this.config.cookieIcon.colorScheme);
    }
  }

  showCookieIcon() {
    if (this.cookieIcon) {
      this.cookieIcon.style.display = "flex";
    }
  }

  hideCookieIcon() {
    if (this.cookieIcon) {
      this.cookieIcon.style.display = "none";
    }
  }

  // ----------------------------------------------------------------
  // Closed Without Choice
  // ----------------------------------------------------------------
  handleClosedWithNoChoice() {
    this.config.cookieTypes.forEach((type) => {
      let accepted = true;
      if (type.required == true) {
        localStorage.setItem(
          `cookieConsent_${type.id}${this.getBannerSuffix()}`,
          accepted.toString()
        );
      } else if (type.defaultValue) {
        localStorage.setItem(
          `cookieConsent_${type.id}${this.getBannerSuffix()}`,
          accepted.toString()
        );
      } else {
        accepted = false;
        localStorage.setItem(
          `cookieConsent_${type.id}${this.getBannerSuffix()}`,
          accepted.toString()
        );
      }

      if (accepted) {
        if (typeof type.onAccept === "function") {
          type.onAccept();
        }
      } else {
        if (typeof type.onReject === "function") {
          type.onReject();
        }
      }
      this.setInitialCookieChoiceMade();
      this.updateCheckboxState();
    });
  }

  // ----------------------------------------------------------------
  // Focus & Scroll Helpers
  // ----------------------------------------------------------------
  getFocusableElements(element) {
    return element.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }

  preventBodyScroll() {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
  }

  allowBodyScroll() {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
  }

  getBannerSuffix() {
    if (this.config.bannerSuffix) {
      return "_" + this.config.bannerSuffix;
    }
    return "";
  }

  // ----------------------------------------------------------------
  // Event Listeners
  // ----------------------------------------------------------------
  setupEventListeners() {
    // Banner listeners
    if (this.banner) {
      const acceptButton = this.banner.querySelector(".accept-all");
      const rejectButton = this.banner.querySelector(".reject-all");
      const preferencesButton = this.banner.querySelector(".preferences");

      acceptButton?.addEventListener("click", () => {
        this.handleCookieChoice(true);
        window.location.reload();
      });
      rejectButton?.addEventListener("click", () => this.handleCookieChoice(false));
      preferencesButton?.addEventListener("click", () => {
        this.showBackdrop();
        this.toggleModal(true);
      });

      // Focus trap for banner
      const focusableElements = this.getFocusableElements(this.banner);
      const firstFocusableEl = focusableElements[0];
      const lastFocusableEl = focusableElements[focusableElements.length - 1];
      this.banner.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusableEl) {
              lastFocusableEl.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusableEl) {
              firstFocusableEl.focus();
              e.preventDefault();
            }
          }
        }
      });

      if (this.config.mode !== "wizard") {
        acceptButton?.focus();
      }
    }

    // Modal listeners (CHANGED)
    if (this.modal) {
      const closeButton = this.modal.querySelector(".modal-close");
      closeButton?.addEventListener("click", () => {
        this.toggleModal(false);
        if (this.hasSetInitialCookieChoices()) {
          this.runStoredCookiePreferenceCallbacks();
        } else {
          this.handleClosedWithNoChoice();
        }
      });

      // Single "Bevestig" button delegates to close logic
      const confirmButton = this.modal.querySelector(".preferences-confirm");
      confirmButton?.addEventListener("click", () => {
        closeButton?.click();
      });

      // Focus trap for modal
      const focusableElements = this.getFocusableElements(this.modal);
      const firstFocusableEl = focusableElements[0];
      const lastFocusableEl = focusableElements[focusableElements.length - 1];
      this.modal.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusableEl) {
              lastFocusableEl.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusableEl) {
              firstFocusableEl.focus();
              e.preventDefault();
            }
          }
        }
        if (e.key === "Escape") {
          this.toggleModal(false);
        }
      });

      // Checkbox change listeners
      const preferencesSection = this.modal.querySelector("#cookie-preferences");
      const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
          const [, cookieId] = event.target.id.split("cookies-");
          const isAccepted = event.target.checked;
          const previousValue =
            localStorage.getItem(`cookieConsent_${cookieId}${this.getBannerSuffix()}`) ===
            "true";
          if (isAccepted !== previousValue) {
            const cookieType = this.config.cookieTypes.find((type) => type.id === cookieId);
            if (cookieType) {
              localStorage.setItem(
                `cookieConsent_${cookieId}${this.getBannerSuffix()}`,
                isAccepted.toString()
              );
              if (isAccepted && typeof cookieType.onAccept === "function") {
                cookieType.onAccept();
              } else if (!isAccepted && typeof cookieType.onReject === "function") {
                cookieType.onReject();
              }
            }
          }
        });
      });
    }

    // Cookie icon listeners
    if (this.cookieIcon) {
      this.cookieIcon.addEventListener("click", () => {
        if (!this.modal) {
          this.createModal();
          this.toggleModal(true);
          this.hideCookieIcon();
        } else if (this.modal.style.display === "none" || this.modal.style.display === "") {
          this.toggleModal(true);
          this.hideCookieIcon();
        } else {
          this.toggleModal(false);
        }
      });
    }
  }
}

(function () {
  window.silktideCookieBannerManager = {};

  let config = {};
  let cookieBanner;

  function updateCookieBannerConfig(userConfig = {}) {
    config = { ...config, ...userConfig };

    // If cookie banner exists, destroy and recreate it with new config
    if (cookieBanner) {
      cookieBanner.destroyCookieBanner();
      cookieBanner = null;
    }

    if (document.body) {
      initCookieBanner();
    } else {
      document.addEventListener("DOMContentLoaded", initCookieBanner, {
        once: true,
      });
    }
  }

  function initCookieBanner() {
    if (!cookieBanner) {
      cookieBanner = new SilktideCookieBanner(config);
    }
  }

  function injectScript(url, loadOption) {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    if (loadOption === "async") {
      script.async = true;
    } else if (loadOption === "defer") {
      script.defer = true;
    }
    document.head.appendChild(script);
  }

  window.silktideCookieBannerManager.initCookieBanner = initCookieBanner;
  window.silktideCookieBannerManager.updateCookieBannerConfig = updateCookieBannerConfig;
  window.silktideCookieBannerManager.injectScript = injectScript;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCookieBanner, { once: true });
  } else {
    initCookieBanner();
  }
})();
