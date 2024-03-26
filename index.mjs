/***
 * Generate autocompletion for VSCode "complete from files" and snippets from public plantuml documentation
 */
import 'zx/globals'
import pdf from "pdf-parse-fork";
import clc from "cli-color";

$.verbose = false
$.noquote = async (...args) => {
    const q = $.quote;
    $.quote = v => v;
    const p = $(...args);
    await p;
    $.quote = q;
    return p
}

const LOG_COMPLETION = clc.blue
const LOG_SNIPPETS = clc.green
const LOG_CONCLUSION = clc.red.bold

const SEP = '>'
const BASE_FOLDER = path.resolve(__dirname)
const RELEASE_FOLDER = path.resolve(path.join(BASE_FOLDER, 'release'))
const OUTPUT_FOLDER = path.resolve(path.join(RELEASE_FOLDER, 'plantuml-helpers'))
const FASTKEYS_FOLDER = path.resolve(path.join(RELEASE_FOLDER, 'fastkeys'))

for (const FOLDER of [OUTPUT_FOLDER, FASTKEYS_FOLDER]) {
    try {
        if (fs.existsSync(FOLDER)) {
            fs.rmSync(FOLDER, { recursive: true, force: true })
        }
        fs.mkdirSync(FOLDER, { recursive: true, force: true });
    } catch (err) { }
}

let snippets = {}

/**
 * Clean string replacing space and _ by -
 * @param {*} name 
 * @returns 
 */
function cleanName(name) {
    return [...new Set(
        name.toLowerCase()
            .replace(/plantuml/g, '')
            .replace(/(\s|\.|_)/g, '-')
            .split('-')
    )
    ].join('-').replace(/--/g, '-')
}

/***
 * Generates autocompletion files and snippets from Stdlib documentation
 */
async function stdlibGenerator() {
    cd(OUTPUT_FOLDER)
    await $.noquote`rm -rf plantuml-stdlib || true `
    await $.noquote`git clone --depth 1 https://github.com/plantuml/plantuml-stdlib`

    //readme parsing for snippets
    const REGEX = /(?:(?:#{2,}\s)(?<title>(?:[^\n\[\(]+)))(?:[^#]*?)(?<body>(?:@start(?<type>[a-z]+))[^@]*?(?:@end[a-z]+))/g
    let result = regexpProcess(REGEX, fs.readFileSync('plantuml-stdlib/README.md', 'utf8')
        .replace(/#{0,3}\s\[[a-z]*\]/gm, ''),
        fromExamples, '', '', false
    )
    Object.assign(snippets, result)

    //tree parsing for autocompletion
    //const REGEX_DEFINE = /^\!(define|procedure)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg
    const REGEX_CODE = /^\!(?:define|procedure)\s?(?:[a-z]+)?\s?(?<body>(?<prefix>[^_\$][^(\$\W]{3,})\((?<params>(?:[^\)]+))\))/gm;
    const REGEX_THEME = /(theme)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg

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
            let result = regexpProcess(REGEX_CODE, content, fromCode, '', '', false)
            Object.assign(snippets, result)
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

/**
 * Generates snippets from PlayingWithPlantUMLSource (not maintained)
 */
async function snippetsGenerator() {
    cd(OUTPUT_FOLDER)
    await $.noquote`rm -rf PlayingWithPlantUMLSource || true`
    await $.noquote`git clone --depth 1 https://github.com/Crashedmind/PlayingWithPlantUMLSource`
    // Snippets
    /*
    {
      "For Loop": {
        "prefix": ["for", "for-const"],
        "body": ["for (const ${2:element} of ${1:array}) {", "\t$0", "}"],
        "description": "A for loop."
      }
    }
    */
    let puml = await glob([`PlayingWithPlantUMLSource/docs/**/*.puml`])
    for (const f of puml) {
        let content = fs.readFileSync(f, 'utf8')
        let name = path.parse(f).name.toLowerCase().split('sample')[0]
        let parent = path.basename(path.dirname(f))

        result[cleanName(`${parent} ${name}`)] = {
            "prefix": [cleanName(`puml-${parent}-${name}`)],
            "body": content.split(os.EOL).map(m => m.trim()),
            "description": cleanName(`${parent} ${name}`)
        }
    }

    await $.noquote`rm -rf PlayingWithPlantUMLSource || true`
    cd(BASE_FOLDER)
}
/**
 * Generates autocompletion files from PlantUML Language Reference Guide
 */
async function pdfGenerator() {
    cd(OUTPUT_FOLDER)
    const FILE = 'PlantUML_Language_Reference_Guide_en.pdf'
    let buffer
    if (process.env.PLANTUML_GUIDE_PATH && fs.existsSync(path.join(process.env.PLANTUML_GUIDE_PATH, FILE))) {
        buffer = path.join(process.env.PLANTUML_GUIDE_PATH, FILE)
    } else {
        const response = await fetch(`https://pdf.plantuml.net/${FILE}`);
        buffer = await response.arrayBuffer();
    }
    let data = await pdf(buffer);
    let text = data.text
        .replace(/(([0-9]*\.?)+\s{2})([^\n]+)(([0-9]*\.?)+\s{2})([A-Z0-9 ]*)/gm, "")
        .replace(/PlantUML Language Reference Guide[^\n]+/gm, "")
        .replace(/\n\d\s{2}/gm, "\nÅ") // chapter
        .replace(/\n(\d+\.?)+\s{2}/gm, "\nÃ") // section
    for (const chapter of text.split('\nÅ')) {
        const sections = chapter.trim().split('\nÃ').slice(1)
        const chapterTitle = chapter.trim().split('\n')[0].trim()
        for (const section of sections) {
            const sectionTitle = section.trim().split('\n')[0].trim()
            let result = regexpProcess(
                /(?:Ã(?:(?:[a-zA-Z- ,]+)\s))?(?:[\s\S]*?)(?<body>(?:@start(?<type>[a-z]+))[\s\S]*?(?:@end[a-z]+))/g,
                'Ã' + section,
                fromExamples,
                sectionTitle,
                chapterTitle
            )
            Object.assign(snippets, result);
        }
    }
    cd('../..')
}

/**
 * Processes a regular expression pattern on the given content and generates snippets based on the matches.
 *
 * @param {RegExp} REGEXP_EXAMPLE - The regular expression pattern to match against the content.
 * @param {string} content - The content to be processed.
 * @param {function} processor - The function to process the matched groups. Default is `fromExamples`.
 * @param {string} title - The title to be assigned to the generated snippets. Default is an empty string.
 * @param {string} global_prefix - The global prefix to be added to the generated snippet prefixes. Default is an empty string.
 * @param {boolean} increment - Whether to increment the snippet prefixes if there are duplicates. Default is `true`.
 * @return {Object} - An object containing the generated snippets, where the keys are the snippet titles and the values are objects with the properties "scope", "prefix", "body", and "description".
 */
function regexpProcess(REGEXP_EXAMPLE, content, processor = fromExamples, title = '', global_prefix = '', increment = true) {
    let m
    let snippets = {}
    let index = 0
    while ((m = REGEXP_EXAMPLE.exec(content)) !== null) {
        if (m.index === REGEXP_EXAMPLE.lastIndex) {
            REGEXP_EXAMPLE.lastIndex++;
        }
        let puml = m.groups
        if (!puml.title) puml.title = title
        if (!puml.prefix) puml.prefix = global_prefix.length > 0 ? clean(global_prefix) + SEP : ''
        puml.title = clean(puml.title)

        let data = processor(puml)
        if (data.body) {
            index++
            if (index > 0 && increment) {
                data.prefix = data.prefix + index
                data.title = data.title + index
            }
            snippets[data.title] = {
                "scope": "plantuml",
                "prefix": [data.prefix],
                "body": data.body,
                "description": data.description
            }
            console.log(LOG_SNIPPETS.italic(`      Snip -> ${data.title}`));
        }
    }
    if (Object.keys(snippets).length > 0) console.log(LOG_SNIPPETS(`Snippets generated: ${Object.keys(snippets).length}`));

    return snippets
}


/**
 * Cleans the data by trimming, converting to lowercase, replacing non-word characters with underscore, 
 * removing consecutive underscores, and removing trailing underscores.
 *
 * @param {string} data - the data to be cleaned
 * @return {string} the cleaned data
 */
function clean(data) {
    return data.trim().toLowerCase().replace(/\W/g, "_").replace(/__/g, '_').replace(/_$/g, '').replace(/^_/g, '')
}

/**
 * Truncates the data by splitting it at '_', removing duplicates, and filtering out specific elements.
 *
 * @param {string} data - the data to be truncated
 * @return {string} the truncated data
 */
function truncate(data) {
    let result = [...new Set(data.split('_'))].filter(f => !['diagram', 'legacy', 'new'].includes(f))
    if (data.length > 30) {
        result= result.slice(0, 2)
    }
    return result.join('_')
}

/**
 * A function to generate a new object based on the input puml.
 *
 * @param {type} puml - the input puml
 * @return {type} the generated object
 */
function fromExamples(puml) {
    let title = puml.prefix + puml.title
    return {
        "title": title,
        "prefix": `p${puml.type}${SEP}${truncate(title)}`,
        "body": puml.body.split('\n'),
        "description": title.replace(/[_>]/g, ' ')
    }
}

/**
 * A function that takes a puml object and returns an object with title, prefix, body, and description properties.
 *
 * @param {type} puml - description of parameter
 * @return {object} An object with title, prefix, body, and description properties
 */
function fromCode(puml) {
    let title = puml.prefix
    return {
        "title": title,
        "prefix": puml.prefix,
        "body": puml.prefix + '(' + puml.params.split(',').map((m, i) => `\$\{${i}:${m.trim()}\}`).join(',') + ')',
        "description": puml.body
    }
}
console.log(LOG_CONCLUSION(`==================================== STDLIB ====================================`));
await stdlibGenerator()
let snip1 = Object.keys(snippets).length
console.log(LOG_CONCLUSION(`Snippets generated: ${snip1}`));

console.log(LOG_CONCLUSION(`==================================== THEME ====================================`));
await themesGenerator()
let snip2 = Object.keys(snippets).length
console.log(LOG_CONCLUSION(`Snippets generated: ${snip2 - snip1}`));

console.log(LOG_CONCLUSION(`==================================== GUIDE ====================================`));
await pdfGenerator()
let snip3 = Object.keys(snippets).length
console.log(LOG_CONCLUSION(`Snippets generated: ${snip3 - snip2}`));
console.log(LOG_CONCLUSION(`Total Snippets generated: ${snip3}`));
if (snip3 < 11000) {
    console.log(clc.magenta('Something went wrong. Not enough snippets generated.'))
    process.exit(1)
}
//VSCode snippets
fs.writeFileSync(path.join(OUTPUT_FOLDER, '..', `plantuml.code-snippets`), JSON.stringify(snippets, null, 2))
// FastKeys autocomplete
fs.writeFileSync(path.join(FASTKEYS_FOLDER, `plantuml.txt`),
    Object.keys(snippets)
        .filter(k => snippets[k].prefix[0].indexOf(SEP) === -1)
        .map(k => {
            //   if (snippets[k].prefix[0].indexOf(SEP) > -1) {
            //      return snippets[k].body.join('\`n')
            //  } else {
            return snippets[k].description
            //   }

        }).join('\n')
    , { flag: 'a' })
