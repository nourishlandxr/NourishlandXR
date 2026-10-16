const safeProjectId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);

// Workspace folders include internal caches and temporary data. A project is
// listable only when its persisted identity agrees with its directory.
export function isListableProjectDirectory(directoryId, project) {
    return safeProjectId(directoryId)
        && project !== null && typeof project === 'object' && !Array.isArray(project)
        && project.id === directoryId && safeProjectId(project.id)
        && typeof project.name === 'string' && project.name.trim().length > 0;
}
