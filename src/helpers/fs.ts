import { existsSync, readdirSync, statSync, unlinkSync, rmdirSync as fsrmdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Recursively remove a directory
 * @param path The directory to delete
 */
export function rmdirSync(path: string) {
    if (existsSync(path)) {
        let files = readdirSync(path);
        files.forEach((fileName) => {
            let filePath = join(path, fileName);
            let stat = statSync(filePath);
            if (stat.isFile()) {
                unlinkSync(filePath);
            } else if (stat.isDirectory()) {
                rmdirSync(filePath);
            }
        });
        fsrmdirSync(path);
    }
}

/**
 * Ensure that a file is writable creating missing paths
 * @param fileName The name of the file
 */
export function ensureFile(fileName: string) {
    let dirName = dirname(fileName);
    if (!existsSync(dirName)) {
        ensureFile(dirName);
        mkdirSync(dirName);
    }
}