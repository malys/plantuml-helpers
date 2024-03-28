export const BASE_FOLDER = path.resolve(__dirname)
export const RELEASE_FOLDER = path.resolve(path.join(BASE_FOLDER, 'release'))
export const OUTPUT_FOLDER = path.resolve(path.join(RELEASE_FOLDER, 'plantuml-helpers'))
export const FASTKEYS_FOLDER = path.resolve(path.join(RELEASE_FOLDER, 'fastkeys'))

/**
 * Cleans the specified folders by removing them if they exist and creating them again.
 *
 * @param {string} folder - The folder to clean.
 * @return {void} This function does not return a value.
 */
export function cleanFolders() {
    // Clean folders
    for (const FOLDER of [OUTPUT_FOLDER, FASTKEYS_FOLDER]) {
        try {
            if (fs.existsSync(FOLDER)) {
                fs.rmSync(FOLDER, { recursive: true, force: true })
            }
            fs.mkdirSync(FOLDER, { recursive: true, force: true });
        } catch (err) { }
    }
}
