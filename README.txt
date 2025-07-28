# Custom Consent Banner

A dynamic cookie consent banner for Ahold domains with automatic URL configuration and consent date tracking.

## Quick Start

Add this code as a **Custom HTML tag** in Google Tag Manager:

```html
<link rel="stylesheet" href="https://kn-tl.github.io/cookie-banner-assets/custom-consent-manager.css">
<script src="https://kn-tl.github.io/cookie-banner-assets/custom-consent-manager.js"></script>
<script>
// Domain configuration
function getDomainConfig() {
  var hostName = window.location.hostname;
  var config = {
    cookieUrl: "/cookie-policy",
    privacyUrl: "/privacy-statement", 
    consentVersion: "3.0"
  };
  
  switch (hostName) {
    case "werk.gall.nl":
      config.cookieUrl = "/privacy-cookie-statement";
      config.privacyUrl = "/privacy-cookie-statement";
      break;
    case "werk.ah.nl":
    case "werk.etos.nl":
      break; // Use defaults
  }
  
  return config;
}

// Banner configuration
var config = getDomainConfig();
customCookieBannerManager.updateCookieBannerConfig({
  consentVersion: config.consentVersion,
  consentDate: "{{CJS - Date - YYMMDD}}", // Replace with your GTM variable
  
  background: { showBackground: true },
  cookieIcon: { position: "bottomLeft" },
  position: { banner: "center" },
  
  cookieTypes: [
    {
      id: "necessary",
      name: "Noodzakelijk",
      description: "<p>Wij gebruiken altijd noodzakelijke cookies. Dit zijn cookies die zorgen dat de website goed functioneert en cookies over het gebruik van de website voor het genereren van geaggregeerde statistieken voor analysedoeleinden. Hierbij verwerken we minimale informatie voor een beperkte periode die niet direct herleidbaar is naar jou zodat we je privacy goed beschermen.</p>",
      required: true
    },
    {
      id: "analyticsPA",
      name: "Persoonlijke analyses",
      description: "<p>We gebruiken analytische cookies waarmee informatie wordt verzameld over je gebruik van onze website. Deze inzichten helpen ons bij strategische en operationele keuzes en het verbeteren van onze diensten.</p>",
      required: false
    },
    {
      id: "marketingExtern",
      name: "Advertenties over vacatures buiten onze website",
      description: "<p>Wij en onze Partners gebruiken cookies en verzamelen daarmee gegevens over je klik- en zoekgedrag voor het leveren van persoonlijke aanbevelingen en advertenties onze website. Deze Partners zullen je persoonsgegevens verwerken voor eigen doeleinden. Hoe ze dat doen wordt beschreven in het privacy- en cookiebeleid van het desbetreffende bedrijf. In ons Cookiebeleid kan je lezen welke bedrijven dit zijn.</p>",
      required: false
    }
  ],
  
  text: {
    banner: {
      description: "<p>Wij gebruiken cookies (en vergelijkbare technieken) om onze website te verbeteren.</p>" +
                   "<p>Daarnaast gebruiken wij en onze Partners cookies om je advertenties over vacatures te tonen buiten onze website. Met deze cookies verzamelen wij en onze Partners informatie over je klik- en zoekgedrag binnen onze website. Onze Partners verzamelen mogelijk ook informatie over je klik- en zoekgedrag buiten onze website. Hiermee kunnen we de website, onze aanbevelingen en advertenties over vacatures aanpassen aan je interesses.</p>" +
                   "<p>Wanneer je op \"Accepteren\" klikt, geef je toestemming voor al onze cookies. Bij \"Weigeren\" worden alleen noodzakelijke cookies geplaatst. Wil je je voorkeuren zelf instellen? Kies dan voor \"Zelf instellen\".</p>" +
                   "<p>Meer informatie lees je in ons <a href=\"" + config.cookieUrl + "\" target=\"_blank\">Cookiebeleid</a> en <a href=\"" + config.privacyUrl + "\" target=\"_blank\">Privacybeleid</a>.</p>",
      acceptAllButtonText: "Accepteren",
      acceptAllButtonAccessibleLabel: "Accept all cookies",
      rejectNonEssentialButtonText: "Weigeren",
      rejectNonEssentialButtonAccessibleLabel: "Reject non-essential",
      preferencesButtonText: "Zelf instellen",
      preferencesButtonAccessibleLabel: "Toggle preferences"
    },
    preferences: {
      title: "Kies je privacy voorkeuren"
    }
  }
});
</script>
```

## How It Works

- **Domain detection**: Automatic configuration based on hostname
- **Default configuration**: Most Ahold domains use standard URLs
- **Consent tracking**: Stores user preferences and date (YYYYMMDD format)  
- **GTM compatible**: ES5 syntax for Google Tag Manager

## Domain Configuration

| Domain | Cookie URL | Privacy URL |
|--------|------------|-------------|
| werk.gall.nl | /privacy-cookie-statement | /privacy-cookie-statement |
| werk.ah.nl | /cookie-policy | /privacy-statement |
| werk.etos.nl | /cookie-policy | /privacy-statement |
| Other domains | /cookie-policy | /privacy-statement |

## Stored Data

The banner creates 6 localStorage items:

| Key | Purpose | Example |
|-----|---------|---------|
| `consent_necessary` | Necessary cookies consent | `"true"` |
| `consent_analyticsPA` | Analytics consent | `"true"` |
| `consent_marketingExtern` | Marketing consent | `"false"` |
| `consent_initialChoice` | User has made choice | `"1"` |
| `consent_version` | Policy version | `"3.0"` |
| `consent_date` | Consent date | `"20250725"` |

## Cookie Categories

1. **Noodzakelijk** (`necessary`) - Always required, website functionality
2. **Persoonlijke analyses** (`analyticsPA`) - Optional, website analytics  
3. **Advertenties over vacatures buiten onze website** (`marketingExtern`) - Optional, external job ads

## GTM Date Variable

Create a custom JavaScript variable in GTM:

```javascript
function() {
  var now = new Date();
  var year = now.getFullYear();
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var day = String(now.getDate()).padStart(2, '0');
  return year + month + day;
}
```

## API Usage

```javascript
// Get consent status
var accepted = customCookieBannerManager.getAcceptedCookies();
console.log(accepted.analyticsPA); // true/false

// Get metadata
var version = customCookieBannerManager.getConsentVersion(); // "3.0"
var date = customCookieBannerManager.getConsentDate(); // "20250725"

// Conditional loading
if (accepted.analyticsPA) {
  // Load Google Analytics
}

if (accepted.marketingExtern) {
  // Load marketing pixels
}
```

## Customization

### Add New Domain
```javascript
case "new-domain.com":
  config.cookieUrl = "/your-cookie-url";
  config.privacyUrl = "/your-privacy-url";
  break;
```

### Change Position
```javascript
position: { banner: "top" } // Options: "center", "top", "bottom"
cookieIcon: { position: "bottomRight" } // Options: "bottomLeft", "bottomRight"
```

### Modify Text
Update the `text.banner.description` and category descriptions as needed.

## For Other Domains

To use on non-Ahold domains, simplify the configuration:

```javascript
function getDomainConfig() {
  return {
    cookieUrl: "/cookie-policy",
    privacyUrl: "/privacy-statement",
    consentVersion: "3.0"
  };
}
```

## Troubleshooting

**Banner not showing?** 
- Clear localStorage: `localStorage.clear()`
- Check console for errors
- Verify GTM tag is published

**Wrong URLs?** 
- Check domain in switch statement
- Verify URL paths exist on website

## Files

- `custom-consent-manager.js` - Main functionality  
- `custom-consent-manager.css` - Styling

---

**Note**: This banner is based on Silktide Consent Manager with customizations for Ahold domains and consent date tracking. 
