import pkg from "../../package.json";

// Single source of truth: bump "version" in package.json and every place updates.
export const APP_VERSION: string = pkg.version;
