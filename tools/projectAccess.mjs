import fs from 'node:fs';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const ID = /^[A-Za-z0-9_-]{1,160}$/;
const HASH = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/;
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const dummyHash = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
const equal = (left, right) => left.length === right.length && crypto.timingSafeEqual(left, right);

export async function hashProjectPassword(password) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 1024) throw new Error('Use a password of 12–1024 characters.');
    const salt = crypto.randomBytes(16).toString('hex');
    return `scrypt:${salt}:${(await scrypt(password, salt, 64, options)).toString('hex')}`;
}

export function validateAccessRegistry(value) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value.users)) throw new Error('Invalid project access registry.');
    const ids = new Set();
    for (const user of value.users) {
        if (!ID.test(user?.id) || ids.has(user.id) || !HASH.test(user.passwordHash)
            || !Number.isSafeInteger(user.sessionVersion) || user.sessionVersion < 1
            || typeof user.disabled !== 'boolean' || !user.projects || Array.isArray(user.projects) || typeof user.projects !== 'object'
            || Object.entries(user.projects).some(([id, role]) => !ID.test(id) || !['editor', 'admin'].includes(role))) throw new Error('Invalid project access user.');
        ids.add(user.id);
    }
    return value;
}

export const projectRole = (identity, projectId) => identity?.platformAdmin ? 'admin' : identity?.projects?.[projectId] || null;

export function createProjectAccess({ registryFile, secret, bootstrapPassword, developmentOpen }) {
    const readUsers = () => registryFile ? validateAccessRegistry(JSON.parse(fs.readFileSync(registryFile, 'utf8'))).users : [];
    // Validate configuration before accepting requests. A missing/corrupt registry must never open access.
    readUsers();
    const bootstrapVersion = crypto.createHash('sha256').update(bootstrapPassword).digest('hex');
    const bootstrap = () => ({ id: 'bootstrap', platformAdmin: true, projects: {}, sessionVersion: bootstrapVersion });
    const sign = body => crypto.createHmac('sha256', secret).update(body).digest('hex');
    return {
        async login(data) {
            const password = typeof data.password === 'string' && data.password.length <= 1024 ? data.password : '';
            if (!data.username && bootstrapPassword && equal(Buffer.from(password), Buffer.from(bootstrapPassword))) return bootstrap();
            const user = readUsers().find(item => item.id === data.username);
            const [, salt, expected] = (user?.passwordHash || dummyHash).match(HASH);
            const actual = await scrypt(password, salt, 64, options);
            if (!equal(actual, Buffer.from(expected, 'hex')) || !user || user.disabled) return null;
            return { id: user.id, platformAdmin: false, projects: user.projects, sessionVersion: user.sessionVersion };
        },
        token(identity, expires) {
            const body = Buffer.from(JSON.stringify({ id: identity.id, bootstrap: identity.platformAdmin, version: identity.sessionVersion, expires })).toString('base64url');
            return `${body}.${sign(body)}`;
        },
        identity(req) {
            if (developmentOpen) return { ...bootstrap(), id: 'development' };
            try {
                const cookie = String(req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith('nourishland_creator='));
                const token = decodeURIComponent(cookie?.slice('nourishland_creator='.length) || '');
                const [body, signature, extra] = token.split('.');
                if (!body || !/^[a-f0-9]{64}$/.test(signature) || extra || !equal(Buffer.from(signature, 'hex'), Buffer.from(sign(body), 'hex'))) return null;
                const value = JSON.parse(Buffer.from(body, 'base64url').toString());
                if (!Number.isSafeInteger(value.expires) || value.expires <= Date.now()) return null;
                if (value.bootstrap === true) return bootstrapPassword && value.id === 'bootstrap' && value.version === bootstrapVersion ? bootstrap() : null;
                const user = readUsers().find(item => item.id === value.id);
                return user && !user.disabled && user.sessionVersion === value.version
                    ? { id: user.id, platformAdmin: false, projects: user.projects, sessionVersion: user.sessionVersion } : null;
            } catch { return null; }
        }
    };
}
