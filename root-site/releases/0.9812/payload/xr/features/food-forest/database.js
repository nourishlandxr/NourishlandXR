const root = document.querySelector('#library');
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const labels = { climate: 'Supplier climate', heightBand: 'Height filter band', pollination: 'Pollination filter', frost: 'Frost filter', foliage: 'Winter foliage filter', timeToHarvest: 'Time to fruit / harvest', potSuitability: 'Pot suitability code', sizeManagement: 'Dwarf / size code', stateRestrictions: 'State restriction codes', harvestSourceCodes: 'Unmapped harvest codes' };
const valueText = value => value?.label || (value?.code !== undefined ? `Code ${value.code}` : String(value));
const pageSize = 32;
let database, quality, selectedId = '', pageIndex = 0, filtered = [];

function setError(error) {
    root.setAttribute('aria-busy', 'false');
    $('#detail').innerHTML = `<div class="error"><strong>The plant database could not be loaded.</strong><p>${esc(error.message || error)}</p><p>Open this page through the local preview server or the hosted Nourishland app so the catalogue JSON can be fetched.</p></div>`;
    $('#result-count').textContent = 'Catalogue unavailable';
    $('#source-note').textContent = 'The database files have not been changed.';
}
function formatNumber(value) { return new Intl.NumberFormat().format(value || 0); }
function setStats() {
    const summary = database.summary || {}, counts = quality?.counts || {};
    const values = [
        [summary.plantCandidates, 'plant candidates'],
        [summary.excludedMerchandise, 'merchandise excluded from planning'],
        [counts.pagesWithLiveSpecifications, 'records with live specifications'],
        [counts.botanicalIdentityMissing, 'missing botanical names']
    ];
    $('#stats').innerHTML = values.map(([value, label]) => `<div class="stat"><strong>${formatNumber(value)}</strong><span>${esc(label)}</span></div>`).join('');
    $('#source-note').textContent = `Supplier snapshot ${database.sourceSnapshotAt || 'date unavailable'} · ${formatNumber(summary.records)} total records · ${quality?.scope || 'Supplier evidence; review before using as growing advice.'}`;
}
function fillFilters() {
    const categories = new Set(), climates = new Set(), functions = new Set();
    for (const record of database.records) {
        for (const category of record.sourceCategories || []) categories.add(category);
        for (const item of record.fields?.climate?.values || []) if (item.label) climates.add(item.label);
        for (const item of record.functions || []) functions.add(item.id);
    }
    const fill = (selector, values, format = value => value) => {
        const select = $(selector), first = select.options[0];
        select.replaceChildren(first, ...[...values].sort((a, b) => String(a).localeCompare(String(b))).map(value => { const option = document.createElement('option'); option.value = value; option.textContent = format(value); return option; }));
    };
    fill('#category', categories);
    fill('#climate', climates);
    fill('#function', functions, value => value.replaceAll('-', ' '));
}
function recordSearchText(record) {
    if (!record._searchText) record._searchText = [record.commonName, record.scientificName, record.sourceDescription, ...(record.sourceCategories || []), record.sku].join(' ').toLocaleLowerCase();
    return record._searchText;
}
function matchRecord(record) {
    const view = $('#view').value, query = $('#search').value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (view === 'plants' && record.listingType === 'merchandise') return false;
    if (view === 'identity' && record.scientificName && record.listingType !== 'plant_identity_review') return false;
    if (view === 'specifications' && !record.specifications) return false;
    if (view === 'unreviewed' && (record.listingType === 'merchandise' || record.review?.status === 'reviewed')) return false;
    if (query.length && !query.every(word => recordSearchText(record).includes(word))) return false;
    const category = $('#category').value;
    if (category && !(record.sourceCategories || []).includes(category)) return false;
    const climate = $('#climate').value;
    if (climate && !(record.fields?.climate?.values || []).some(value => value.label === climate)) return false;
    const functionId = $('#function').value;
    if (functionId && !(record.functions || []).some(item => item.id === functionId)) return false;
    return true;
}
function renderResults() {
    filtered = database.records.filter(matchRecord).sort((a, b) => a.commonName.localeCompare(b.commonName));
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    pageIndex = Math.min(pageIndex, pages - 1);
    const visible = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    $('#result-count').textContent = `${formatNumber(filtered.length)} ${filtered.length === 1 ? 'record' : 'records'}`;
    $('#page-label').textContent = filtered.length ? `${pageIndex + 1} / ${pages}` : '';
    $('#previous').disabled = pageIndex <= 0;
    $('#next').disabled = pageIndex >= pages - 1;
    $('#results').innerHTML = visible.length ? visible.map(record => {
        const review = record.review?.status === 'reviewed' ? 'Reviewed' : 'Needs review';
        const scientific = record.scientificName || (record.listingType === 'merchandise' ? 'Catalogue item · not a plant' : 'Botanical name not supplied');
        const live = record.specifications ? '<span class="badge">Live details</span>' : '';
        return `<button class="result-card" type="button" role="option" aria-selected="${record.id === selectedId}" data-id="${esc(record.id)}"><span class="result-name">${esc(record.commonName || 'Unnamed record')}</span><span class="result-scientific">${esc(scientific)}</span><span class="badges"><span class="badge review">${review}</span>${live}<span class="badge">SKU ${esc(record.sku)}</span></span></button>`;
    }).join('') : '<div class="empty-results">No records match these filters. Try a broader search.</div>';
    if (!visible.some(record => record.id === selectedId)) selectedId = visible[0]?.id || '';
    if (selectedId) renderDetail(database.records.find(record => record.id === selectedId));
    else $('#detail').innerHTML = '<div class="empty-detail">No matching records to display.</div>';
}
function section(title, content) { return `<section class="detail-section"><h3>${esc(title)}</h3>${content}</section>`; }
function safeHttpUrl(value) {
    try { const url = new URL(value, location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
function facts(items) {
    return `<div class="detail-grid">${items.map(([key, value]) => `<div class="fact"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`;
}
function renderDetail(record) {
    if (!record) return;
    const sourceUrl = safeHttpUrl(record.sourceUrl);
    const source = sourceUrl ? `<a class="source-button" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">Open supplier page ↗</a>` : '';
    let markup = `<div class="detail-top"><div><h2>${esc(record.commonName || 'Unnamed record')}</h2><p class="taxon">${esc(record.scientificName || 'Botanical name not supplied')}</p><code class="record-id">${esc(record.id)} · ${esc(record.listingType)}</code></div>${source}</div>`;
    markup += section('Record status', facts([
        ['Review', record.review?.status || 'unreviewed'],
        ['Supplier snapshot', record.sourceSnapshotAt || 'Not recorded'],
        ['Product group', record.productGroupId || 'Not supplied'],
        ['Taxon group', record.taxonGroupId || 'Not grouped']
    ]));
    if (record.sourceCategories?.length) markup += section('Supplier categories', `<div class="category-list">${record.sourceCategories.map(item => `<span class="category">${esc(item)}</span>`).join('')}</div>`);
    const fieldFacts = Object.entries(record.fields || {}).map(([key, field]) => [labels[key] || key, (field.values || []).map(valueText).join(', ') || 'No mapped value']);
    if (fieldFacts.length) markup += section('Supplier filters', `${facts(fieldFacts)}<p style="margin-top:9px;font-size:11px;color:#718076">Filter bands and codes describe the supplier catalogue. Unmapped values remain codes.</p>`);
    if (record.specifications?.values) {
        const specificationFacts = Object.entries(record.specifications.values).map(([key, value]) => [key, value]);
        markup += section('Live product specifications', `${facts(specificationFacts)}<p style="margin-top:9px;font-size:10px;color:#718076">Retrieved ${esc(record.specifications.retrievedAt || 'date unavailable')} · supplier values are shown as supplied.</p>`);
    }
    if (record.traitCandidates?.length) {
        markup += section('Normalized trait candidates', record.traitCandidates.map(trait => `<div class="evidence-card"><p><strong>${esc(trait.id.replaceAll('-', ' '))}:</strong> ${esc(Array.isArray(trait.value) ? trait.value.join(', ') : trait.value)}${trait.rangeM ? ` · ${esc(trait.rangeM.min)}–${esc(trait.rangeM.max ?? 'more')} m` : ''}${trait.normalized ? ` · ${esc(trait.normalized.replaceAll('-', ' '))}` : ''}</p><small>${esc(trait.status)} · ${esc(trait.basis)} · ${esc(trait.evidence)}</small></div>`).join(''));
    }
    if (record.functions?.length) {
        markup += section('Description evidence · review candidates', record.functions.map(item => `<div class="evidence-card ${item.polarity === 'negative' ? 'negative' : item.polarity === 'conditional' ? 'conditional' : ''}"><p><strong>${esc(item.id.replaceAll('-', ' '))}</strong> · ${esc(item.polarity || 'candidate')}</p><p>${esc(item.evidence)}</p><small>${esc(item.status)} · ${esc(item.basis)}${item.caution ? ` · ${esc(item.caution)}` : ''}</small></div>`).join(''));
    } else markup += section('Description evidence', '<p>No function signals matched by the current review rules.</p>');
    if (record.context?.length) markup += section('Food forest context candidates', facts(record.context.map(item => [item.id.replaceAll('-', ' '), `${item.basis}${item.regionalSuitability ? ` · ${item.regionalSuitability}` : ''}`])));
    if (record.layer) markup += section('Layer suggestion', facts([['Suggested role', record.layer.value || 'Unassigned'], ['Status', record.layer.status], ['Basis', record.layer.basis || 'None'], ['Note', record.layer.note || 'No planting recommendation']])) ;
    if (record.pollinisers?.length) {
        const targets = record.pollinisers.flatMap(group => group.ids || []);
        markup += section('Explicit polliniser links', `${targets.length ? `<div class="category-list">${targets.map(id => { const linked = database.records.find(item => item.id === id); return linked ? `<button class="category" type="button" data-id="${esc(id)}">${esc(linked.commonName)} (${esc(id)})</button>` : `<span class="category">${esc(id)} · not in this snapshot</span>`; }).join('')}</div>` : '<p>No linked product IDs listed.</p>'}${record.pollinisers.map(group => group.sourceText ? `<p style="margin-top:9px;font-size:11px">${esc(group.sourceText)}</p>` : '').join('')}`);
    }
    if (record.curated) markup += section('Curated override', `<pre class="raw-details">${esc(JSON.stringify(record.curated, null, 2))}</pre>`);
    if (record.sourceDescription) markup += section('Supplier description', `<p>${esc(record.sourceDescription)}</p>`);
    markup += section('Raw supplier filters', `<details class="raw-details"><summary>Show original filter codes</summary><pre>${esc(JSON.stringify(record.rawFilters || {}, null, 2))}</pre></details>`);
    $('#detail').innerHTML = markup;
}
function selectRecord(id) {
    const record = database.records.find(item => item.id === id);
    if (!record) return;
    selectedId = id;
    document.querySelectorAll('.result-card').forEach(button => button.setAttribute('aria-selected', String(button.dataset.id === id)));
    renderDetail(record);
}
function renderFailure(error) { setError(error); }
for (const selector of ['#search', '#category', '#climate', '#function', '#view']) $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => { pageIndex = 0; if (database) renderResults(); });
$('#results').addEventListener('click', event => { const button = event.target.closest('[data-id]'); if (button) selectRecord(button.dataset.id); });
$('#detail').addEventListener('click', event => { const button = event.target.closest('[data-id]'); if (button) selectRecord(button.dataset.id); });
$('#previous').addEventListener('click', () => { if (pageIndex > 0) { pageIndex--; renderResults(); $('#results').scrollTop = 0; } });
$('#next').addEventListener('click', () => { if ((pageIndex + 1) * pageSize < filtered.length) { pageIndex++; renderResults(); $('#results').scrollTop = 0; } });

try {
    const assets = new URL('../../assets/food-forest/', import.meta.url);
    const [catalogResponse, qualityResponse] = await Promise.all([
        fetch(new URL('plants.json', assets)), fetch(new URL('data-quality.json', assets))
    ]);
    if (!catalogResponse.ok) throw new Error(`Catalogue request failed (${catalogResponse.status})`);
    database = await catalogResponse.json();
    quality = qualityResponse.ok ? await qualityResponse.json() : null;
    setStats(); fillFilters(); renderResults(); root.setAttribute('aria-busy', 'false');
} catch (error) { renderFailure(error); }
