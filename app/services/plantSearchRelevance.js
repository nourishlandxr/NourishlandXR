const text = value => String(value ?? '').trim();

export function normalizePlantSearchText(value) {
    return text(value)
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function plantGenus(result = {}) {
    const scientificName = normalizePlantSearchText(result.scientificName || result.canonicalName);
    return scientificName.split(' ')[0] || '';
}

function scientificKey(result = {}) {
    return normalizePlantSearchText(result.canonicalName || result.scientificName || result.externalId);
}

function sourceKey(result = {}) {
    return normalizePlantSearchText(result.source || result.sourceLabel || result.externalId);
}

function resultNames(result = {}) {
    return [result.commonName, result.scientificName, result.canonicalName]
        .map(normalizePlantSearchText)
        .filter(Boolean);
}

function hasExactName(result, query) {
    return Boolean(query) && resultNames(result).some(name => name === query);
}

function hasNameTerms(result, query) {
    const terms = query.split(' ').filter(Boolean);
    if (!terms.length) return false;
    return resultNames(result).some(name => {
        const words = new Set(name.split(' '));
        return terms.every(term => words.has(term));
    });
}

function matchDetails(kind, label, tone, rank) {
    return Object.freeze({ kind, label, tone, rank });
}

export function rankPlantSearchResults(results, query) {
    const value = normalizePlantSearchText(query);
    const records = Array.isArray(results) ? results : [];
    const directMatches = records.filter(result => hasExactName(result, value));
    const genusQuery = records.filter(result => plantGenus(result) === value && !value.includes(' '));
    const directGroups = new Map();
    directMatches.forEach(result => {
        const key = scientificKey(result);
        if (!key) return;
        const group = directGroups.get(key) || { sources: new Set(), results: [] };
        group.sources.add(sourceKey(result));
        group.results.push(result);
        directGroups.set(key, group);
    });
    const strongestDirectGroups = [...directGroups.values()].filter(group => group.sources.size === Math.max(...[...directGroups.values()].map(candidate => candidate.sources.size), 0));
    // A common name can be shared by several taxa. Prefer the species supported
    // by the most independent databases; if support is tied, keep the results
    // visibly reviewable instead of presenting an arbitrary green exact match.
    const consensusDirectResults = strongestDirectGroups.length === 1
        ? new Set(strongestDirectGroups[0].results)
        : new Set();
    const exactGenera = new Set([...consensusDirectResults, ...genusQuery].map(plantGenus).filter(Boolean));

    return records
        .map((result, index) => {
            const genus = plantGenus(result);
            const exact = consensusDirectResults.has(result);
            const genusMatch = genus && exactGenera.has(genus);
            const nameMatch = hasNameTerms(result, value);
            const searchMatch = exact
                ? matchDetails('exact', 'Exact species/name', 'exact', 0)
                : genusQuery.includes(result)
                    ? matchDetails('genus', 'Genus match', 'exact', 0)
                    : genusMatch
                        ? matchDetails('same-genus', 'Same genus · review species', 'related', 1)
                        : nameMatch
                            ? matchDetails('name-match', 'Name match · review species', 'related', 2)
                            : matchDetails('other', 'Other match · check species', 'caution', 3);
            return { ...result, searchMatch, searchResultIndex: index };
        })
        .sort((left, right) => left.searchMatch.rank - right.searchMatch.rank || left.searchResultIndex - right.searchResultIndex);
}
