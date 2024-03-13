/***
 * Generate autocompletion for VSCode "complete from files" and snippets from public plantuml documentation
 */
import 'zx/globals'
import pdf from "pdf-parse-fork";

$.verbose = true
$.noquote = async (...args) => {
    const q = $.quote;
    $.quote = v => v;
    const p = $(...args);
    await p;
    $.quote = q;
    return p
}
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
    const REGEX = /((#{0,3}\s)(?<title>([a-zA-Z- ,]+)\s))(?<between>[\s\S]*?)(?<body>(@start(?<type>[a-z]+))[\s\S]*?(@end[a-z]+))/g
    Object.assign(snippets, regexpProcess(REGEX, fs.readFileSync('plantuml-stdlib/README.md', 'utf8').replace(/#{0,3}\s\[[a-z]*\]/gm, '')))

    //tree parsing for autocompletion
    //const REGEX_DEFINE = /^\!(define|procedure)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg
    const REGEX_CODE = /^\!(define|procedure)\s?([a-z]+)?\s?(?<body>(?<prefix>[^_\$][^(\$\W]{3,})\((?<params>([^\)]+))\))/gm;
    const REGEX_THEME = /(theme)\s?([a-z]+)?\s?([^_\$][^(\$\W]{3,})\(/mg

    const folders = await glob('plantuml-stdlib/*', { onlyDirectories: true })
    for (const folder of folders) {
        let puml = await glob([`${folder}/**/*.puml`])
        puml = puml.filter(f => f.indexOf(`${folder}`) > -1 && f.indexOf('LARGE') === -1)
        let result = []
        let define = []
        let theme = []
        puml.forEach(f => {
            let content = fs.readFileSync(f, 'utf8')
            //console.log(`Start to processing ${f}`)
            Object.assign(snippets, regexpProcess(REGEX_CODE, content, fromCode))
            //  define.push([...content.matchAll(REGEX_DEFINE)].map(match => match[3].trim()))
            theme.push([...content.matchAll(REGEX_THEME)].map(match => match[3].trim()))
            //console.log(`Finish to processing ${f}`)
        })

        //"plantuml-stdlib/logos/gaugeio.puml"
        //Components
        result.push(puml.filter(f => f.indexOf('theme') === -1).map(p => p.replace('plantuml-stdlib/', 'include <').replace('.puml', '>')))
        result.push(define.flat())

        //Theme
        result.push(theme.flat().filter(f => f && f.length > 0).map(m => `theme ${m}`))
        result.push(puml.filter(f => f.indexOf('theme') !== -1).map(p => p.replace('plantuml-stdlib/', 'theme').replace('.puml', '>')))

        //Overall
        result = [...new Set(result.flat())].filter(f => f !== undefined && f.toUpperCase() !== f)

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
    puml.forEach(f => {
        let content = fs.readFileSync(f, 'utf8')
        let name = path.parse(f).name.toLowerCase().split('sample')[0]
        let parent = path.basename(path.dirname(f))

        result[cleanName(`${parent} ${name}`)] = {
            "prefix": [cleanName(`puml-${parent}-${name}`)],
            "body": content.split(os.EOL).map(m => m.trim()),
            "description": cleanName(`${parent} ${name}`)
        }
    })

    await $.noquote`rm -rf PlayingWithPlantUMLSource || true`
    cd(BASE_FOLDER)
}
/**
 * Generates autocompletion files from PlantUML Language Reference Guide
 */
async function pdfGenerator() {
    cd(OUTPUT_FOLDER)
    const FILE = 'PlantUML_Language_Reference_Guide_en.pdf'
    const response = await fetch(`https://pdf.plantuml.net/${FILE}`);
    const buffer = await response.arrayBuffer();
    let data = await pdf(buffer);
    let text = data.text.split('\n').filter(f => !f.startsWith("PlantUML Language Reference Guide")).join('\n')
    Object.assign(snippets, regexpProcess(/((([0-9]*\.?)+\s{2})(?<title>([a-zA-Z- ,]+)\s))(?<between>[\s\S]*?)(?<body>(@start(?<type>[a-z]+))[\s\S]*?(@end[a-z]+))/g, text));
    cd('../..')
}

/**
 * Processes the data using a regular expression to extract and format specific information.
 *
 * @param {object} data - the data to be processed
 * @return {object} 
 */
function regexpProcess(REGEXP_EXAMPLE, data, processor = fromExamples) {
    let m
    let snippets = {}
    while ((m = REGEXP_EXAMPLE.exec(data)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === REGEXP_EXAMPLE.lastIndex) {
            regex.lastIndex++;
        }

        let data = processor(m.groups)

        snippets[data.title] = {
            "scope": "plantuml",
            "prefix": [data.prefix],
            "body": data.body,
            "description": data.description
        }

    }
    return snippets
}

/**
 * A function to generate a new object based on the input puml.
 *
 * @param {type} puml - the input puml
 * @return {type} the generated object
 */
function fromExamples(puml) {
    let title = puml.title.trim().toLowerCase().replace(/\W/g, "_")
    return {
        "title": title,
        "prefix": `p${puml.type}${SEP}${title}`.replace('__', '_'),
        "body": puml.body.split('\n').map(m => m.replace(/((([0-9]*\.?)+\s{2})(?<title>([a-zA-Z- ,0-9]+)\s))/g, '').trim()),
        "description": title
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

await stdlibGenerator()
await themesGenerator()
await pdfGenerator()


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


