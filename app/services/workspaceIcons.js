const DASHBOARD_ICON_PATHS = Object.freeze({
    plant: '<path d="M12 21V10M12 15C5 15 3 11 3 6c6 0 9 3 9 9Zm0-4c0-5 3-8 9-8 0 5-3 8-9 8Z"/>',
    note: '<path d="M5 3h10l4 4v14H5zM15 3v5h4M8 12h8M8 16h6"/>',
    totem: '<path d="M12 2v20M3 5h14l4 3-4 3H3zM21 14H7l-4 3 4 3h14z"/>',
    home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ar: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M7 9l5-3 5 3v6l-5 3-5-3zM7 9l5 3 5-3M12 12v6"/>',
    scan: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><rect x="7" y="7" width="4" height="4" rx=".5"/><path d="M15 7h2v4h-2M7 15v2h4v-2M15 14v3h2v-3M14 11h3"/>',
    explore: '<circle cx="12" cy="12" r="9"/><path d="m16.5 7.5-3 6-6 3 3-6 6-3Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    pin: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',

    area: '<path d="M4 5.5 10 3l4 2 6-2v15.5L14 21l-4-2-6 2V5.5Z"/><path d="M10 3v16M14 5v16"/>',
    webhub: '<path d="M4 19.5c2.4-2.2 5.1-2.7 8-1.5 2.9-1.2 5.6-.7 8 1.5"/><path d="M12 18V6"/><path d="M12 10c-3.4 0-5.7-1.5-6.8-4.5C8.6 5.1 10.9 6.6 12 10Zm0 2c3.4 0 5.7-1.5 6.8-4.5C15.4 7.1 13.1 8.6 12 12Z"/>',
    settings: '<path d="m12 3 1.2 2.4 2.6.6 2.2-1.4 1.4 1.4-1.4 2.2.6 2.6L21 12l-2.4 1.2-.6 2.6 1.4 2.2-1.4 1.4-2.2-1.4-2.6.6L12 21l-1.2-2.4-2.6-.6L6 19.4l-1.4-1.4L6 15.8l-.6-2.6L3 12l2.4-1.2L6 8.2 4.6 6l1.4-1.4 2.2 1.4 2.6-.6L12 3Z"/><circle cx="12" cy="12" r="3"/>',
    adjustments: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
    help: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z"/><path d="M5 4.5A2.5 2.5 0 0 0 2.5 7v12A2.5 2.5 0 0 1 5 21.5M9 7h7M9 11h7"/>',
    print: '<path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/><path d="M18 12h.01"/>'
});

export function dashboardIcon(name) {
    return `<svg class="dashboard-inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${DASHBOARD_ICON_PATHS[name] || DASHBOARD_ICON_PATHS.area}</svg>`;
}
