// Custom Consent Manager - Based on Silktide Consent Manager
// Original: https://silktide.com/consent-manager/

class CustomCookieBanner {
	constructor(config = {}) {
		this.config = config;
		this.elements = {
			wrapper: null,
			banner: null,
			modal: null,
			cookieIcon: null,
			backdrop: null
		};

		this.initializeBanner();
	}

	// ----------------------------------------------------------------
	// Initialization
	// ----------------------------------------------------------------
	initializeBanner() {
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
		if (this.elements.wrapper?.parentNode) {
			this.elements.wrapper.parentNode.removeChild(this.elements.wrapper);
		}

		this.allowBodyScroll();
		this.elements = {
			wrapper: null,
			banner: null,
			modal: null,
			cookieIcon: null,
			backdrop: null
		};
	}

	// ----------------------------------------------------------------
	// DOM Element Creation
	// ----------------------------------------------------------------
	createWrapper() {
		this.elements.wrapper = document.createElement("div");
		this.elements.wrapper.id = "custom-wrapper";
		document.body.insertBefore(this.elements.wrapper, document.body.firstChild);
	}

	createWrapperChild(htmlContent, id) {
		const child = document.createElement("div");
		child.id = id;
		child.innerHTML = htmlContent;

		if (!this.elements.wrapper || !document.body.contains(this.elements.wrapper)) {
			this.createWrapper();
		}

		this.elements.wrapper.appendChild(child);
		return child;
	}

	// ----------------------------------------------------------------
	// Backdrop Management
	// ----------------------------------------------------------------
	createBackdrop() {
		this.elements.backdrop = this.createWrapperChild(null, "custom-backdrop");
	}

	showBackdrop() {
		if (this.elements.backdrop) {
			this.elements.backdrop.style.display = "block";
		}
		this.config.onBackdropOpen?.();
	}

	hideBackdrop() {
		if (this.elements.backdrop) {
			this.elements.backdrop.style.display = "none";
		}
		this.config.onBackdropClose?.();
	}

	shouldShowBackdrop() {
		return this.config?.background?.showBackground ?? false;
	}

	// ----------------------------------------------------------------
	// Checkbox State Management
	// ----------------------------------------------------------------
	updateCheckboxState(saveToStorage = false) {
		const preferencesSection = this.elements.modal?.querySelector("#cookie-preferences");
		if (!preferencesSection) return;

		const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');

		checkboxes.forEach(checkbox => {
			const [, cookieId] = checkbox.id.split("cookies-");
			const cookieType = this.config.cookieTypes?.find(type => type.id === cookieId);
			if (!cookieType) return;

			if (saveToStorage) {
				this.saveCheckboxState(checkbox, cookieId, cookieType);
			} else {
				this.loadCheckboxState(checkbox, cookieId, cookieType);
			}
		});
	}

	saveCheckboxState(checkbox, cookieId, cookieType) {
		const currentState = checkbox.checked;

		if (cookieType.required) {
			this.setCookieConsent(cookieId, true);
		} else {
			this.setCookieConsent(cookieId, currentState);
			this.runCookieCallback(cookieType, currentState);
		}
	}

	loadCheckboxState(checkbox, cookieId, cookieType) {
		if (cookieType.required) {
			checkbox.checked = true;
			checkbox.disabled = true;
		} else {
			const storedValue = this.getCookieConsent(cookieId);
			checkbox.checked = storedValue ?? cookieType.defaultValue ?? false;
		}
	}

	// ----------------------------------------------------------------
	// Consent Management
	// ----------------------------------------------------------------
	setInitialCookieChoiceMade() {
		localStorage.setItem(`consent_initialChoice${this.getBannerSuffix()}`, "1");
	}

	handleCookieChoice(accepted) {
		this.setInitialCookieChoiceMade();
		this.saveConsentVersion();
		this.hideBannerAndShowIcon();
		this.saveAllCookieChoices(accepted);
		this.runGlobalCallbacks(accepted);
		this.updateCheckboxState();
	}

	saveConsentVersion() {
		if (this.config.consentVersion) {
			localStorage.setItem(`consent_version${this.getBannerSuffix()}`, this.config.consentVersion);
		}
		
		// Save consent date if provided in config
		if (this.config.consentDate) {
			localStorage.setItem(`consent_date${this.getBannerSuffix()}`, this.config.consentDate);
		}
	}

	hideBannerAndShowIcon() {
		this.removeBanner();
		this.hideBackdrop();
		this.toggleModal(false);
		this.showCookieIcon();
	}

	saveAllCookieChoices(accepted) {
		this.config.cookieTypes?.forEach(type => {
			if (type.required) {
				this.setCookieConsent(type.id, true);
				this.runCookieCallback(type, true);
			} else {
				this.setCookieConsent(type.id, accepted);
				this.runCookieCallback(type, accepted);
			}
		});
	}

	runGlobalCallbacks(accepted) {
		if (accepted) {
			this.config.onAcceptAll?.();
		} else {
			this.config.onRejectAll?.();
		}
	}

	runCookieCallback(cookieType, accepted) {
		if (accepted) {
			cookieType.onAccept?.();
		} else {
			cookieType.onReject?.();
		}
	}

	getAcceptedCookies() {
		return this.config.cookieTypes?.reduce((acc, cookieType) => {
			acc[cookieType.id] = this.getCookieConsent(cookieType.id);
			return acc;
		}, {}) ?? {};
	}

	getConsentVersion() {
		return localStorage.getItem(`consent_version${this.getBannerSuffix()}`);
	}

	getConsentDate() {
		return localStorage.getItem(`consent_date${this.getBannerSuffix()}`);
	}

	// ----------------------------------------------------------------
	// Cookie Callback Management
	// ----------------------------------------------------------------
	runAcceptedCookieCallbacks() {
		if (!this.config.cookieTypes) return;

		const acceptedCookies = this.getAcceptedCookies();
		this.config.cookieTypes.forEach(type => {
			if (!type.required && acceptedCookies[type.id]) {
				type.onAccept?.();
			}
		});
	}

	runRejectedCookieCallbacks() {
		if (!this.config.cookieTypes) return;

		const rejectedCookies = this.getRejectedCookies();
		this.config.cookieTypes.forEach(type => {
			if (rejectedCookies[type.id]) {
				type.onReject?.();
			}
		});
	}

	runStoredCookiePreferenceCallbacks() {
		this.config.cookieTypes?.forEach(type => {
			const accepted = this.getCookieConsent(type.id);
			this.runCookieCallback(type, accepted);
		});
	}

	loadRequiredCookies() {
		this.config.cookieTypes?.forEach(cookie => {
			if (cookie.required) {
				cookie.onAccept?.();
			}
		});
	}

	// ----------------------------------------------------------------
	// Banner Management
	// ----------------------------------------------------------------
	getBannerContent() {
		const {
			description = "We use cookies on our site to enhance your user experience, provide personalized content, and analyze our traffic.",
			acceptAllButtonText = "Accept all",
			acceptAllButtonAccessibleLabel,
			rejectNonEssentialButtonText = "Reject non-essential",
			rejectNonEssentialButtonAccessibleLabel,
			preferencesButtonText = "Preferences",
			preferencesButtonAccessibleLabel
		} = this.config.text?.banner ?? {};

		const acceptButton = this.createButton({
			className: "accept-all st-button st-button--primary",
			text: acceptAllButtonText,
			ariaLabel: acceptAllButtonAccessibleLabel
		});

		const rejectButton = this.createButton({
			className: "reject-all st-button st-button--secondary",
			text: rejectNonEssentialButtonText,
			ariaLabel: rejectNonEssentialButtonAccessibleLabel
		});

		const preferencesButton = this.createButton({
			className: "preferences",
			text: preferencesButtonText,
			ariaLabel: preferencesButtonAccessibleLabel
		});

		return `
			${description}
			<div class="actions">
				<div class="actions-left">
					${preferencesButton}
				</div>
				<div class="actions-right">
					${rejectButton}
					${acceptButton}
				</div>
			</div>
		`;
	}

	createButton({ className, text, ariaLabel }) {
		const ariaLabelAttr = ariaLabel && ariaLabel !== text ? ` aria-label="${ariaLabel}"` : "";
		return `<button class="${className}"${ariaLabelAttr}>${text}</button>`;
	}

	hasSetInitialCookieChoices() {
		return !!localStorage.getItem(`consent_initialChoice${this.getBannerSuffix()}`);
	}

	createBanner() {
		this.elements.banner = this.createWrapperChild(this.getBannerContent(), "custom-banner");

		if (this.elements.banner && this.config.position?.banner) {
			this.elements.banner.classList.add(this.config.position.banner);
		}

		this.config.onBannerOpen?.();
	}

	createBannerWithEventListeners() {
		this.createBanner();
		this.setupBannerEventListeners();
	}

	setupBannerEventListeners() {
		if (!this.elements.banner) return;

		const acceptButton = this.elements.banner.querySelector(".accept-all");
		const rejectButton = this.elements.banner.querySelector(".reject-all");
		const preferencesButton = this.elements.banner.querySelector(".preferences");

		acceptButton?.addEventListener("click", () => {
			this.handleCookieChoice(true);
			window.location.reload();
		});

		rejectButton?.addEventListener("click", () => this.handleCookieChoice(false));

		preferencesButton?.addEventListener("click", () => {
			this.showBackdrop();
			this.toggleModal(true);
		});

		this.setupFocusTrap(this.elements.banner);
		this.setInitialFocus(acceptButton);
	}

	removeBanner() {
		if (this.elements.banner?.parentNode) {
			this.elements.banner.parentNode.removeChild(this.elements.banner);
			this.elements.banner = null;
			this.config.onBannerClose?.();
		}
	}

	shouldShowBanner() {
		if (this.config.showBanner === false) return false;
		return !this.hasSetInitialCookieChoices();
	}

	// ----------------------------------------------------------------
	// Modal Management
	// ----------------------------------------------------------------
	getModalContent() {
		const {
			title = "Kies je privacy voorkeuren",
			description = "<p></p>"
		} = this.config.text?.preferences ?? {};

		const closeButton = this.createCloseButton();
		const cookieTypes = this.config.cookieTypes ?? [];
		const acceptedCookieMap = this.getAcceptedCookies();

		const cookieFields = cookieTypes.map(type => this.createCookieField(type, acceptedCookieMap)).join("");

		return `
			<div class="modal-header">
				<h1>${title}</h1>
				${closeButton}
			</div>
			${description}
			<section id="cookie-preferences">
				${cookieFields}
			</section>
			<div class="modal-footer">
				<button class="preferences-confirm st-button st-button--primary">
					Bevestig
				</button>
			</div>
		`;
	}

	createCloseButton() {
		return `
			<button class="modal-close" aria-label="Terug naar banner">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M16 20L8 12L16 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		`;
	}

	createCookieField(type, acceptedCookieMap) {
		const accepted = acceptedCookieMap[type.id];
		let isChecked = false;

		if (accepted) {
			isChecked = true;
		} else if (!this.hasSetInitialCookieChoices()) {
			isChecked = type.defaultValue ?? false;
		}

		const checkedAttr = type.required ? "checked disabled" : isChecked ? "checked" : "";

		return `
			<fieldset>
				<legend>${type.name}</legend>
				<div class="cookie-type-content">
					<div class="cookie-type-description">${type.description}</div>
					<label class="switch" for="cookies-${type.id}">
						<input type="checkbox" id="cookies-${type.id}" ${checkedAttr} />
						<span class="switch__pill" aria-hidden="true"></span>
						<span class="switch__dot" aria-hidden="true"></span>
						<span class="switch__off" aria-hidden="true">Uit</span>
						<span class="switch__on" aria-hidden="true">Aan</span>
					</label>
				</div>
			</fieldset>
		`;
	}

	createModal() {
		this.elements.modal = this.createWrapperChild(this.getModalContent(), "custom-modal");
	}

	toggleModal(show) {
		if (!this.elements.modal) return;

		this.elements.modal.style.display = show ? "flex" : "none";

		if (show) {
			this.showModal();
		} else {
			this.hideModal();
		}
	}

	showModal() {
		this.showBackdrop();
		this.hideCookieIcon();
		this.removeBanner();
		this.preventBodyScroll();

		const modalCloseButton = this.elements.modal.querySelector(".modal-close");
		modalCloseButton?.focus();

		this.config.onPreferencesOpen?.();
		this.updateCheckboxState(false);
	}

	hideModal() {
		this.setInitialCookieChoiceMade();
		this.updateCheckboxState(true);
		this.hideBackdrop();
		this.showCookieIcon();
		this.allowBodyScroll();
		this.config.onPreferencesClose?.();
	}

	hideModalWithoutSaving() {
		if (!this.elements.modal) return;

		this.elements.modal.style.display = "none";
		this.hideBackdrop();
		this.allowBodyScroll();
		this.config.onPreferencesClose?.();
	}

	saveCurrentCheckboxStates() {
		const preferencesSection = this.elements.modal?.querySelector("#cookie-preferences");
		if (!preferencesSection) return;

		const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');

		checkboxes.forEach(checkbox => {
			const [, cookieId] = checkbox.id.split("cookies-");
			const isAccepted = checkbox.checked;
			const cookieType = this.config.cookieTypes?.find(type => type.id === cookieId);

			if (cookieType) {
				this.setCookieConsent(cookieId, isAccepted);
				this.runCookieCallback(cookieType, isAccepted);
			}
		});

		this.setInitialCookieChoiceMade();
		this.saveConsentVersion();
	}

	// ----------------------------------------------------------------
	// Cookie Icon Management
	// ----------------------------------------------------------------
	getCookieIconContent() {
		return `
			<svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M19.1172 1.15625C19.0547 0.734374 18.7344 0.390624 18.3125 0.328124C16.5859 0.0859365 14.8281 0.398437 13.2813 1.21875L7.5 4.30469C5.96094 5.125 4.71875 6.41406 3.95313 7.98437L1.08594 13.8906C0.320314 15.4609 0.0703136 17.2422 0.375001 18.9609L1.50781 25.4297C1.8125 27.1562 2.64844 28.7344 3.90625 29.9531L8.61719 34.5156C9.875 35.7344 11.4766 36.5156 13.2031 36.7578L19.6875 37.6719C21.4141 37.9141 23.1719 37.6016 24.7188 36.7812L30.5 33.6953C32.0391 32.875 33.2813 31.5859 34.0469 30.0078L36.9141 24.1094C37.6797 22.5391 37.9297 20.7578 37.625 19.0391C37.5547 18.625 37.2109 18.3125 36.7969 18.25C32.7734 17.6094 29.5469 14.5703 28.6328 10.6406C28.4922 10.0469 28.0078 9.59375 27.4063 9.5C23.1406 8.82031 19.7734 5.4375 19.1094 1.15625H19.1172ZM15.25 10.25C15.913 10.25 16.5489 10.5134 17.0178 10.9822C17.4866 11.4511 17.75 12.087 17.75 12.75C17.75 13.413 17.4866 14.0489 17.0178 14.5178C16.5489 14.9866 15.913 15.25 15.25 15.25C14.587 15.25 13.9511 14.9866 13.4822 14.5178C13.0134 14.0489 12.75 13.413 12.75 12.75C12.75 12.087 13.0134 11.4511 13.4822 10.9822C13.9511 10.5134 14.587 10.25 15.25 10.25ZM10.25 25.25C10.25 24.587 10.5134 23.9511 10.9822 23.4822C11.4511 23.0134 12.087 22.75 12.75 22.75C13.413 22.75 14.0489 23.0134 14.5178 23.4822C14.9866 23.9511 15.25 24.587 15.25 25.25C15.25 25.913 14.9866 26.5489 14.5178 27.0178C14.0489 27.4866 13.413 27.75 12.75 27.75C12.087 27.75 11.4511 27.4866 10.9822 27.0178C10.5134 26.5489 10.25 25.913 10.25 25.25ZM27.75 20.25C28.413 20.25 29.0489 20.5134 29.5178 20.9822C29.9866 21.4511 30.25 22.087 30.25 22.75C30.25 23.413 29.9866 24.0489 29.5178 24.5178C29.0489 24.9866 28.413 25.25 27.75 25.25C27.087 25.25 26.4511 24.9866 25.9822 24.5178C25.5134 24.0489 25.25 23.413 25.25 22.75C25.25 22.087 25.5134 21.4511 25.9822 20.9822C26.4511 20.5134 27.087 20.25 27.75 20.25Z" />
			</svg>
		`;
	}

	createCookieIcon() {
		this.elements.cookieIcon = document.createElement("button");
		this.elements.cookieIcon.id = "custom-cookie-icon";
		this.elements.cookieIcon.innerHTML = this.getCookieIconContent();

		if (this.config.text?.banner?.preferencesButtonAccessibleLabel) {
			this.elements.cookieIcon.ariaLabel = this.config.text.banner.preferencesButtonAccessibleLabel;
		}

		if (!this.elements.wrapper || !document.body.contains(this.elements.wrapper)) {
			this.createWrapper();
		}

		this.elements.wrapper.appendChild(this.elements.cookieIcon);

		if (this.elements.cookieIcon && this.config.cookieIcon?.position) {
			this.elements.cookieIcon.classList.add(this.config.cookieIcon.position);
		}

		if (this.elements.cookieIcon && this.config.cookieIcon?.colorScheme) {
			this.elements.cookieIcon.classList.add(this.config.cookieIcon.colorScheme);
		}
	}

	showCookieIcon() {
		if (this.elements.cookieIcon) {
			this.elements.cookieIcon.style.display = "flex";
		}
	}

	hideCookieIcon() {
		if (this.elements.cookieIcon) {
			this.elements.cookieIcon.style.display = "none";
		}
	}

	// ----------------------------------------------------------------
	// Event Listeners
	// ----------------------------------------------------------------
	setupEventListeners() {
		if (this.elements.banner) {
			this.setupBannerEventListeners();
		}

		if (this.elements.modal) {
			this.setupModalEventListeners();
		}

		if (this.elements.cookieIcon) {
			this.setupCookieIconEventListeners();
		}
	}

	setupModalEventListeners() {
		const closeButton = this.elements.modal.querySelector(".modal-close");
		const acceptAllButton = this.elements.modal.querySelector(".preferences-accept-all");
		const rejectAllButton = this.elements.modal.querySelector(".preferences-reject-all");
		const confirmButton = this.elements.modal.querySelector(".preferences-confirm");

		closeButton?.addEventListener("click", () => {
			this.hideModalWithoutSaving();
			this.createBannerWithEventListeners();
			this.showBackdrop();
		});

		acceptAllButton?.addEventListener("click", () => {
			this.handleCookieChoice(true);
			window.location.reload();
		});

		rejectAllButton?.addEventListener("click", () => this.handleCookieChoice(false));

		confirmButton?.addEventListener("click", () => {
			this.saveCurrentCheckboxStates();
			window.location.reload();
		});

		this.setupFocusTrap(this.elements.modal);
		this.setupModalKeyboardEvents();
		this.setupCheckboxEventListeners();
		closeButton?.focus();
	}

	setupModalKeyboardEvents() {
		this.elements.modal.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				this.toggleModal(false);
			}
		});
	}

	setupCheckboxEventListeners() {
		const preferencesSection = this.elements.modal.querySelector("#cookie-preferences");
		const checkboxes = preferencesSection?.querySelectorAll('input[type="checkbox"]');

		checkboxes?.forEach(checkbox => {
			checkbox.addEventListener("change", () => {
				// Only update visual state, localStorage will be saved on confirm
			});
		});
	}

	setupCookieIconEventListeners() {
		this.elements.cookieIcon.addEventListener("click", () => {
			if (!this.elements.modal) {
				this.createModal();
				this.toggleModal(true);
				this.hideCookieIcon();
			} else if (this.elements.modal.style.display === "none" || this.elements.modal.style.display === "") {
				this.toggleModal(true);
				this.hideCookieIcon();
			} else {
				this.toggleModal(false);
			}
		});
	}

	setupFocusTrap(element) {
		const focusableElements = this.getFocusableElements(element);
		const firstFocusableEl = focusableElements[0];
		const lastFocusableEl = focusableElements[focusableElements.length - 1];

		element.addEventListener("keydown", (e) => {
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
	}

	setInitialFocus(element) {
		if (this.config.mode !== "wizard") {
			element?.focus();
		}
	}

	// ----------------------------------------------------------------
	// Utility Methods
	// ----------------------------------------------------------------
	getFocusableElements(element) {
		return element.querySelectorAll(
			'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
	}

	getBannerSuffix() {
		return this.config.bannerSuffix ? `_${this.config.bannerSuffix}` : "";
	}

	setCookieConsent(cookieId, value) {
		localStorage.setItem(`consent_${cookieId}${this.getBannerSuffix()}`, value.toString());
	}

	getCookieConsent(cookieId) {
		return localStorage.getItem(`consent_${cookieId}${this.getBannerSuffix()}`) === "true";
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
}

// ----------------------------------------------------------------
// Global Manager
// ----------------------------------------------------------------
(function () {
	window.customCookieBannerManager = {};

	let config = {};
	let cookieBanner;

	const updateCookieBannerConfig = (userConfig = {}) => {
		config = { ...config, ...userConfig };

		if (cookieBanner) {
			cookieBanner.destroyCookieBanner();
			cookieBanner = null;
		}

		if (document.body) {
			initCookieBanner();
		} else {
			document.addEventListener("DOMContentLoaded", initCookieBanner, { once: true });
		}
	};

	const initCookieBanner = () => {
		if (!cookieBanner) {
			cookieBanner = new CustomCookieBanner(config);
		}
	};

	const injectScript = (url, loadOption) => {
		const existingScript = document.querySelector(`script[src="${url}"]`);
		if (existingScript) return;

		const script = document.createElement("script");
		script.src = url;

		if (loadOption === "async") {
			script.async = true;
		} else if (loadOption === "defer") {
			script.defer = true;
		}

		document.head.appendChild(script);
	};

	// Public API
	window.customCookieBannerManager.updateCookieBannerConfig = updateCookieBannerConfig;
	window.customCookieBannerManager.initCookieBanner = initCookieBanner;
	window.customCookieBannerManager.injectScript = injectScript;
	window.customCookieBannerManager.getAcceptedCookies = () => 
		cookieBanner?.getAcceptedCookies() ?? {};
	window.customCookieBannerManager.getConsentVersion = () => 
		cookieBanner?.getConsentVersion() ?? null;
	window.customCookieBannerManager.getConsentDate = () => 
		cookieBanner?.getConsentDate() ?? null;

	// Initialize on DOM ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initCookieBanner, { once: true });
	} else {
		initCookieBanner();
	}
})();
