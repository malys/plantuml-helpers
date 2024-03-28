import 'zx/globals'
import { OUTPUT_FOLDER, BASE_FOLDER } from './folders.mjs'
import { LOG_COMPLETION } from './logs.mjs'
/**
 * Generates autocompletion files from PlantUML themes
 */
async function themesGenerator() {
    cd(OUTPUT_FOLDER)
    await $.noquote`rm -rf puml-themes || true`
    await $.noquote`git clone --depth 1 https://github.com/plantuml/puml-themes`

    // PlantUML themes
    let themes = await glob('puml-themes/themes/*', { onlyDirectories: true })
    themes = themes.map(t => `theme ${t.replace('puml-themes/themes/', '')}`)

    console.log(LOG_COMPLETION(`Autocompletion: ${themes.length}`));
    // Export autocompletion files
    fs.writeFileSync(path.join(`plantuml-themes.complete`), themes.map(m => m.trim()).join("\n"))
    await $.noquote`rm -rf puml-themes || true`
    cd(BASE_FOLDER)
}

export default themesGenerator;