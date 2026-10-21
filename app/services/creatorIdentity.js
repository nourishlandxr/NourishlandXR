const logoUrl = new URL('../v2/assets/nourishland-ceramic-logo.png', import.meta.url).href;

// Crop the supplied artwork in presentation only; retain the original asset.
export function creatorLogoMarkup(className = '') {
    return `<span class="creator-brand-mark ${className}" aria-hidden="true"><img src="${logoUrl}" alt="" width="1216" height="1293" decoding="async"></span>`;
}
export function creatorLoadingMarkup() {
    return `<section class="screen creator-loading" aria-label="Opening Nourishland Creator"><div class="creator-loading-identity"><div class="creator-loading-orbit">${creatorLogoMarkup()}<span class="creator-loading-ring"></span><span class="creator-loading-ring creator-loading-ring--outer"></span></div><p class="creator-loading-wordmark">nourishland</p><h1>Creator</h1><p class="creator-loading-status" role="status">Opening your project<span class="creator-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></p></div></section>`;
}
