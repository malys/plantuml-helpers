import 'zx/globals'
import { regexpProcess, fromExamples, fromCode } from './processor.mjs'
import { OUTPUT_FOLDER, FASTKEYS_FOLDER, BASE_FOLDER } from './folders.mjs'
import { LOG_COMPLETION } from './logs.mjs'

const REGEX_README = /(?:(?:#{2,}\s)(?<title>(?:[^\n\[\(]+)))(?:[^#]*?)(?<body>(?:@start(?<type>[a-z]+))[^@]*?(?:@end[a-z]+))/g

//const REGEX_DEFINE = /^\!(define|procedure)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg
const REGEX_CODE = /^\!(?:define|definelong|procedure)\s(?<body>(?<prefix>[^\(]+)\((?<params>(?:[^\)]+))\))/gm;
const REGEX_THEME = /(theme)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg

/***
 * Generates autocompletion files and snippets from Stdlib documentation
 */
async function stdlibGenerator(snippets) {
    cd(OUTPUT_FOLDER)
    await $.noquote`rm -rf plantuml-stdlib || true `
    await $.noquote`git clone --depth 1 https://github.com/plantuml/plantuml-stdlib`

    //readme parsing for snippets
    let result = regexpProcess(REGEX_README, fs.readFileSync('plantuml-stdlib/README.md', 'utf8')
        .replace(/#{0,3}\s\[[a-z]*\]/gm, ''),
        fromExamples, '', '', false
    )
    Object.assign(snippets, result)

    //tree parsing for autocompletion
    const folders = await glob('plantuml-stdlib/*', { onlyDirectories: true })
    for (const folder of folders) {
        let puml = await glob([`${folder}/**/*.puml`])
        puml = puml.filter(f => f.indexOf(`${folder}`) > -1 && f.indexOf('LARGE') === -1)
        let result = []
        let define = []
        let theme = []

        for (const f of puml) {
            let content = fs.readFileSync(f, 'utf8')
            //console.log(`Start to processing ${f}`)
            let snips = regexpProcess(REGEX_CODE, content, fromCode, '', '', false)
            Object.assign(snippets, snips)
            theme.push([...content.matchAll(REGEX_THEME)].map(match => match[3].trim()))
            //console.log(`Finish to processing ${f}`)
        }

        //"plantuml-stdlib/logos/gaugeio.puml"
        //Components
        result.push(puml.filter(f => f.indexOf('theme') === -1).map(p => p.replace('plantuml-stdlib/', 'include <').replace('.puml', '>')))
        result.push(define.flat())

        //Theme
        result.push(theme.flat().filter(f => f && f.length > 0).map(m => `theme ${m}`))
        result.push(puml.filter(f => f.indexOf('theme') !== -1).map(p => p.replace('plantuml-stdlib/', 'theme').replace('.puml', '>')))

        //Overall
        result = [...new Set(result.flat())].filter(f => f !== undefined && f.toUpperCase() !== f)

        console.log(LOG_COMPLETION(`Autocompletion from ${path.basename(folder)}: ${result.length}`));
        // Export autocompletion files
        fs.writeFileSync(path.join(`plantuml-${folder.split('/')[1]}.complete`), result.map(m => m.trim()).join("\n"))

        //Export Fastkeys in append mode
        fs.writeFileSync(path.join(FASTKEYS_FOLDER, "plantuml.txt"), result.map(m => m.trim()).join("\n"), { flag: 'a' })

    }
    await $.noquote`rm -rf plantuml-stdlib || true `
    cd(BASE_FOLDER)
}

export default stdlibGenerator;

