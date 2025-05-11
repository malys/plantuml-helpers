import 'zx/globals'
import { regexpProcess, fromExamples, fromCode } from './processor.mjs'
import { OUTPUT_FOLDER, FASTKEYS_FOLDER, BASE_FOLDER } from './folders.mjs'
import { LOG_COMPLETION } from './logs.mjs'

const REGEX_README = /(?:(?:#{2,}\s)(?<title>(?:[^\n\[\(]+)))(?:[^#]*?)(?<body>(?:@start(?<type>[a-z]+))[^@]*?(?:@end[a-z]+))/g

//const REGEX_DEFINE = /^\!(define|procedure)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg
const REGEX_CODE = /^\!(?:define|definelong|procedure)\s(?<body>(?<prefix>[^\(\s]+)(?:\((?<params>(?:[^\)]+))\))?)[^\n]*/gm;
const REGEX_THEME = /(theme)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg

/**
 * Generates snippets and autocompletion files from plantuml-stdlib
 *
 * Steps:
 * 1. Clone repository
 * 2. Parse readme for snippets
 * 3. Parse all puml files in the repository tree
 * 4. Generate autocompletion files
 * 5. Export autocompletion files
 * 6. Export Fastkeys in append mode
 * 7. Remove repository
 * 8. Go back to base folder
 */
async function stdlibGenerator(snippets,LIB_NAME,REPOSITORY,README,GIT_ROOT_FOLDER,FILTER="*",REPLACE={from:"",to:""},REGX_CODE=REGEX_CODE) {
    cd(OUTPUT_FOLDER)
    await $.noquote`rm -rf ${LIB_NAME} || true `
    await $.noquote`git clone --depth 1 ${REPOSITORY} ${LIB_NAME}`

    //readme parsing for snippets
    let result = regexpProcess(REGEX_README, fs.readFileSync(README, 'utf8')
        .replace(/#{0,3}\s\[[a-z]*\]/gm, ''),
        fromExamples, '', '', false
    )
    Object.assign(snippets, result)

    //tree parsing for autocompletion
    const folders = await glob(`${GIT_ROOT_FOLDER}/*`, { onlyDirectories: true })
    for (const folder of folders) {
        let puml = await glob([`${folder}/**/${FILTER}.puml`])
        puml = puml.filter(f => f.indexOf(`${folder}`) > -1 && f.indexOf('LARGE') === -1)
        let result = []
        let define = []
        let theme = []

        for (const f of puml) {
            let content = fs.readFileSync(f, 'utf8')
            //console.log(`Start to processing ${f}`)
            let snips = regexpProcess(REGX_CODE, content, fromCode, '', '', false)
            Object.assign(snippets, snips)
            theme.push([...content.matchAll(REGEX_THEME)].map(match => match[3].trim()))
            //console.log(`Finish to processing ${f}`)
        }

        //Components
        result.push(puml.filter(f => f.indexOf('theme') === -1).map(p => p.replace(`${GIT_ROOT_FOLDER}/`, 'include <').replace('.puml', '>')))
        result.push(define.flat())

        //Theme
        //result.push(theme.flat().filter(f => f && f.length > 0).map(m => `theme ${m}`))
        //result.push(puml.filter(f => f.indexOf('theme') !== -1).map(p => p.replace(`${GIT_ROOT_FOLDER}/`, 'theme').replace('.puml', '>')))

        //Overall
        result = [...new Set(result.flat())].filter(f => f !== undefined && f.toUpperCase() !== f)

        let name=path.basename(folder.replace(GIT_ROOT_FOLDER,""))
        console.log(LOG_COMPLETION(`Autocompletion from ${name}: ${result.length}`));
        // Export autocompletion files
        fs.writeFileSync(path.join(`plantuml-${LIB_NAME}-${name}.complete`), result.map(m => m.replace(REPLACE.from,REPLACE.to).trim()).join("\n"))

        //Export Fastkeys in append mode
        fs.writeFileSync(path.join(FASTKEYS_FOLDER, `plantuml-${LIB_NAME}.txt`), result.map(m => m.trim()).join("\n"), { flag: 'a' })

    }
    await $.noquote`rm -rf ${LIB_NAME} || true `
    cd(BASE_FOLDER)
}

export default stdlibGenerator;

