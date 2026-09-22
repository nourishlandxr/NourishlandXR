import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const ZIP64_SENTINEL = 0xffffffff;

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
        table[index] = value >>> 0;
    }
    return table;
})();

function crc32(buffer) {
    let value = 0xffffffff;
    for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
}

function decodeName(buffer, flags) {
    return buffer.toString((flags & 0x0800) ? 'utf8' : 'latin1');
}

function safeArchivePath(name) {
    const normalized = String(name || '').replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (!normalized || normalized.includes('\0') || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
        throw new Error('ZIP contains an unsafe path');
    }
    if (parts.some(part => part === '.' || part === '..')) throw new Error('ZIP contains an unsafe path');
    return { normalized, parts };
}

function findEndOfCentralDirectory(archive) {
    const firstPossibleOffset = Math.max(0, archive.length - 65_557);
    for (let offset = archive.length - 22; offset >= firstPossibleOffset; offset -= 1) {
        if (archive.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
    }
    throw new Error('ZIP end record is missing');
}

function readEntries(archive, { maxFiles, maxUncompressedBytes }) {
    const eocdOffset = findEndOfCentralDirectory(archive);
    const diskNumber = archive.readUInt16LE(eocdOffset + 4);
    const centralDisk = archive.readUInt16LE(eocdOffset + 6);
    const diskEntries = archive.readUInt16LE(eocdOffset + 8);
    const entryCount = archive.readUInt16LE(eocdOffset + 10);
    const centralSize = archive.readUInt32LE(eocdOffset + 12);
    const centralOffset = archive.readUInt32LE(eocdOffset + 16);
    if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== entryCount) throw new Error('Multi-disk ZIP files are not supported');
    if (entryCount === 0xffff || centralSize === ZIP64_SENTINEL || centralOffset === ZIP64_SENTINEL) throw new Error('ZIP64 files are not supported');
    if (entryCount > maxFiles) throw new Error('ZIP contains too many files');
    if (centralOffset + centralSize > eocdOffset || centralOffset + centralSize > archive.length) throw new Error('ZIP central directory is invalid');

    const entries = [];
    let totalUncompressed = 0;
    let offset = centralOffset;
    for (let index = 0; index < entryCount; index += 1) {
        if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== CENTRAL_SIGNATURE) throw new Error('ZIP central directory is invalid');
        const versionMadeBy = archive.readUInt16LE(offset + 4);
        const flags = archive.readUInt16LE(offset + 8);
        const method = archive.readUInt16LE(offset + 10);
        const expectedCrc = archive.readUInt32LE(offset + 16);
        const compressedSize = archive.readUInt32LE(offset + 20);
        const uncompressedSize = archive.readUInt32LE(offset + 24);
        const nameLength = archive.readUInt16LE(offset + 28);
        const extraLength = archive.readUInt16LE(offset + 30);
        const commentLength = archive.readUInt16LE(offset + 32);
        const diskStart = archive.readUInt16LE(offset + 34);
        const externalAttributes = archive.readUInt32LE(offset + 38);
        const localOffset = archive.readUInt32LE(offset + 42);
        const end = offset + 46 + nameLength + extraLength + commentLength;
        if (end > archive.length) throw new Error('ZIP entry metadata is truncated');
        if (diskStart !== 0 || compressedSize === ZIP64_SENTINEL || uncompressedSize === ZIP64_SENTINEL || localOffset === ZIP64_SENTINEL) {
            throw new Error('ZIP64 files are not supported');
        }
        if (flags & 0x0001) throw new Error('Encrypted ZIP entries are not supported');
        if (![0, 8].includes(method)) throw new Error(`ZIP compression method ${method} is not supported`);
        const name = decodeName(archive.subarray(offset + 46, offset + 46 + nameLength), flags);
        const safePath = safeArchivePath(name);
        const unixMode = (externalAttributes >>> 16) & 0xffff;
        const unixFileType = unixMode & 0xf000;
        if ((versionMadeBy >>> 8) === 3 && unixFileType === 0xa000) throw new Error('ZIP symbolic links are not supported');
        totalUncompressed += uncompressedSize;
        if (totalUncompressed > maxUncompressedBytes) throw new Error('ZIP expands beyond the allowed size');
        entries.push({
            ...safePath,
            isDirectory: name.endsWith('/') || unixFileType === 0x4000,
            flags,
            method,
            expectedCrc,
            compressedSize,
            uncompressedSize,
            localOffset
        });
        offset = end;
    }
    if (offset !== centralOffset + centralSize) throw new Error('ZIP central directory size is invalid');
    return entries;
}

export function extractZipArchive(archivePath, destination, options = {}) {
    const maxFiles = Number.isFinite(options.maxFiles) ? options.maxFiles : 10_000;
    const maxUncompressedBytes = Number.isFinite(options.maxUncompressedBytes) ? options.maxUncompressedBytes : 100 * 1024 * 1024;
    const archive = fs.readFileSync(archivePath);
    const entries = readEntries(archive, { maxFiles, maxUncompressedBytes });
    const destinationRoot = path.resolve(destination);
    fs.mkdirSync(destinationRoot, { recursive: true });
    const seen = new Set();

    for (const entry of entries) {
        const entryKey = entry.parts.join('/');
        if (!entryKey || seen.has(entryKey)) throw new Error('ZIP contains duplicate or empty paths');
        seen.add(entryKey);
        const target = path.resolve(destinationRoot, ...entry.parts);
        if (!target.startsWith(`${destinationRoot}${path.sep}`)) throw new Error('ZIP contains an unsafe path');
        if (entry.isDirectory) {
            fs.mkdirSync(target, { recursive: true });
            continue;
        }
        if (entry.localOffset + 30 > archive.length || archive.readUInt32LE(entry.localOffset) !== LOCAL_SIGNATURE) throw new Error('ZIP local entry is invalid');
        const localFlags = archive.readUInt16LE(entry.localOffset + 6);
        const localMethod = archive.readUInt16LE(entry.localOffset + 8);
        const localNameLength = archive.readUInt16LE(entry.localOffset + 26);
        const localExtraLength = archive.readUInt16LE(entry.localOffset + 28);
        if (localFlags !== entry.flags || localMethod !== entry.method) throw new Error('ZIP entry metadata does not match');
        const dataOffset = entry.localOffset + 30 + localNameLength + localExtraLength;
        const dataEnd = dataOffset + entry.compressedSize;
        if (dataEnd > archive.length) throw new Error('ZIP entry data is truncated');
        const compressed = archive.subarray(dataOffset, dataEnd);
        let contents;
        try {
            contents = entry.method === 0
                ? Buffer.from(compressed)
                : zlib.inflateRawSync(compressed, { maxOutputLength: maxUncompressedBytes });
        } catch {
            throw new Error(`ZIP entry could not be decompressed: ${entry.normalized}`);
        }
        if (contents.length !== entry.uncompressedSize || crc32(contents) !== entry.expectedCrc) throw new Error(`ZIP entry failed integrity checks: ${entry.normalized}`);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents, { flag: 'wx' });
    }
    return entries.map(entry => entry.normalized);
}

function dosTimestamp(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
}

function collectSourceEntries(sourceDirectory) {
    const sourceRoot = path.resolve(sourceDirectory);
    const rootName = path.basename(sourceRoot);
    const entries = [{ absolutePath: sourceRoot, archiveName: `${rootName}/`, isDirectory: true }];
    const visit = (directory, archivePrefix) => {
        for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
            if (item.isSymbolicLink()) throw new Error('Symbolic links cannot be exported');
            const absolutePath = path.join(directory, item.name);
            const archiveName = `${archivePrefix}${item.name}${item.isDirectory() ? '/' : ''}`;
            if (item.isDirectory()) {
                entries.push({ absolutePath, archiveName, isDirectory: true });
                visit(absolutePath, archiveName);
            } else if (item.isFile()) {
                entries.push({ absolutePath, archiveName, isDirectory: false });
            }
        }
    };
    visit(sourceRoot, `${rootName}/`);
    return entries;
}

export function createZipArchive(sourceDirectory, archivePath) {
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    const timestamp = dosTimestamp();
    const entries = collectSourceEntries(sourceDirectory);
    if (entries.length > 0xffff) throw new Error('Project contains too many files for a ZIP archive');

    for (const entry of entries) {
        const name = Buffer.from(entry.archiveName, 'utf8');
        const contents = entry.isDirectory ? Buffer.alloc(0) : fs.readFileSync(entry.absolutePath);
        const deflated = entry.isDirectory ? contents : zlib.deflateRawSync(contents);
        const method = !entry.isDirectory && deflated.length < contents.length ? 8 : 0;
        const compressed = method === 8 ? deflated : contents;
        const checksum = crc32(contents);
        if (compressed.length > ZIP64_SENTINEL || contents.length > ZIP64_SENTINEL || localOffset > ZIP64_SENTINEL) throw new Error('Project is too large for a standard ZIP archive');

        const local = Buffer.alloc(30);
        local.writeUInt32LE(LOCAL_SIGNATURE, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(timestamp.time, 10);
        local.writeUInt16LE(timestamp.day, 12);
        local.writeUInt32LE(checksum, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(contents.length, 22);
        local.writeUInt16LE(name.length, 26);
        localParts.push(local, name, compressed);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(CENTRAL_SIGNATURE, 0);
        central.writeUInt16LE(0x0314, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(method, 10);
        central.writeUInt16LE(timestamp.time, 12);
        central.writeUInt16LE(timestamp.day, 14);
        central.writeUInt32LE(checksum, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(contents.length, 24);
        central.writeUInt16LE(name.length, 28);
        const unixMode = entry.isDirectory ? 0o040755 : 0o100644;
        central.writeUInt32LE(((unixMode << 16) | (entry.isDirectory ? 0x10 : 0)) >>> 0, 38);
        central.writeUInt32LE(localOffset, 42);
        centralParts.push(central, name);
        localOffset += local.length + name.length + compressed.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralDirectory.length, 12);
    eocd.writeUInt32LE(localOffset, 16);
    fs.writeFileSync(archivePath, Buffer.concat([...localParts, centralDirectory, eocd]));
    return archivePath;
}
