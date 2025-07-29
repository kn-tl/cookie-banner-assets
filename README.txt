# Custom Consent Banner

A GDPR-compliant consent banner for Ahold websites, built for Google Tag Manager deployment.

## Quick Start

1. **Add to GTM Custom HTML Tag:**
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
    consentVersion: "4.0"
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
  gtmContainerVersion: "{{Container Version}}", // Replace with your GTM container version variable
  
  background: { showBackground: true },
  cookieIcon: { position: "bottomLeft" },
  position: { banner: "center" },
  
  cookieTypes: [
    {
      id: "necessary",
      name: "Noodzakelijk",
      description: "<p>Wij gebruiken altijd noodzakelijke cookies...</p>",
      required: true
    },
    {
      id: "analyticsPA", 
      name: "Persoonlijke analyses",
      description: "<p>We gebruiken analytische cookies...</p>",
      required: false
    },
    {
      id: "marketingExtern",
      name: "Advertenties over vacatures buiten onze website", 
      description: "<p>Wij en onze Partners gebruiken cookies...</p>",
      required: false
    }
  ],
  
  text: {
    banner: {
      description: "<p>Wij gebruiken cookies...</p>" +
                   "<p>Meer informatie lees je in ons <a href=\"" + config.cookieUrl + "\" target=\"_blank\">Cookiebeleid</a>...</p>",
      acceptAllButtonText: "Accepteren",
      rejectNonEssentialButtonText: "Weigeren", 
      preferencesButtonText: "Zelf instellen"
    },
    preferences: {
      title: "Kies je privacy voorkeuren"
    }
  }
});
</script>
```

## Stored Data

All consent data is stored in **one consolidated 1st-party cookie** (`consent`) containing a JSON structure:

### Cookie Structure: `consent`
```json
{
  "consent": {
    "consentDate": "20250729",
    "consentVersion": "4.0", 
    "consentStatus": "partial",
    "consentCategories": {
      "necessary": true,
      "analyticsPA": true,
      "marketingExtern": false
    },
    "consentHost": "werk.ah.nl",
    "gtmContainerVersion": "1194"
  }
}
```

### Consent Status Values:
- **`"accepted"`**: All optional categories are true
- **`"denied"`**: All optional categories are false  
- **`"partial"`**: At least one optional category is true

## GTM Integration

### 1. Create Required GTM Variables

**Date Variable:**
- **Variable Type**: Custom JavaScript
- **Variable Name**: `CJS - Date - YYMMDD`
- **Code**:
```javascript
function() {
  var today = new Date();
  var year = today.getFullYear();
  var month = String(today.getMonth() + 1).padStart(2, '0');
  var day = String(today.getDate()).padStart(2, '0');
  return year + month + day;
}
```

**Container Version Variable:**
- **Variable Type**: Custom JavaScript  
- **Variable Name**: `Container Version`
- **Code**:
```javascript
function() {
  return {{Container Version Number}};
}
```

### 2. Read Consent Data in GTM

**Option A: Full Consent Object**
- **Variable Type**: 1st Party Cookie
- **Cookie Name**: `consent`
- **Decode URI**: ☑️

**Option B: Specific Values via Custom JavaScript**
```javascript
function() {
  var consentCookie = {{consent}};
  if (consentCookie) {
    try {
      var data = JSON.parse(consentCookie);
      return data.consent.consentStatus; // or any other property
    } catch(e) {
      return null;
    }
  }
  return null;
}
```

### 3. Send to GA4
```javascript
// Example: Send consolidated consent data
var consentData = JSON.parse({{consent}} || '{}');
var consentInfo = consentData.consent;

if (consentInfo) {
  gtag('event', 'consent_given', {
    'consent_status': consentInfo.consentStatus,
    'consent_version': consentInfo.consentVersion,
    'consent_date': consentInfo.consentDate,
    'consent_host': consentInfo.consentHost,
    'gtm_container_version': consentInfo.gtmContainerVersion,
    'analytics_consent': consentInfo.consentCategories.analyticsPA,
    'marketing_consent': consentInfo.consentCategories.marketingExtern
  });
}
```

## Cookie Categories

1. **Noodzakelijk** - Essential cookies (always enabled)
2. **Persoonlijke analyses** - Analytics cookies  
3. **Advertenties over vacatures buiten onze website** - Marketing cookies

## API Usage

```javascript
// Get full consent object
var consentData = customCookieBannerManager.getConsolidatedConsent();
// Returns: { consent: { ... } }

// Get specific values
var categories = customCookieBannerManager.getAcceptedCookies();
// Returns: {necessary: true, analyticsPA: true, marketingExtern: false}

var status = customCookieBannerManager.getConsentStatus(); // "partial"
var version = customCookieBannerManager.getConsentVersion(); // "4.0"
var date = customCookieBannerManager.getConsentDate(); // "20250729"
var host = customCookieBannerManager.getConsentHost(); // "werk.ah.nl"
var containerVersion = customCookieBannerManager.getGtmContainerVersion(); // "1194"
```

## Domain Configuration

The banner automatically configures URLs based on the current domain:
- **werk.gall.nl**: Uses `/privacy-cookie-statement` for both links
- **werk.ah.nl & werk.etos.nl**: Uses default `/cookie-policy` and `/privacy-statement`

## Files

| File | Description |
|------|-------------|
| `custom-consent-manager.js` | Core functionality |
| `custom-consent-manager.css` | Styling |
| `README.md` | This documentation |

## Troubleshooting

**Banner not showing?**
- Check browser console for JavaScript errors
- Verify GTM date variable syntax
- Test on a fresh browser/incognito mode

**Cookie not saving?**
- Check if the domain allows 1st-party cookies
- Verify no Content Security Policy blocks the banner
- Check browser developer tools → Application → Cookies for `consent`

**Invalid JSON in cookie?**
- Clear the `consent` cookie and test again
- Check browser console for parsing errors

---
*Based on Silktide Consent Manager - Modified for Ahold use cases* 
