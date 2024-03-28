import { LOG_SNIPPETS } from "./logs.mjs"

export const SEP = '>'
/**
 * Clean string replacing space and _ by -
 * @param {*} name 
 * @returns 
 */
export function cleanName(name) {
    return [...new Set(
        name.toLowerCase()
            .replace(/plantuml/g, '')
            .replace(/(\s|\.|_)/g, '-')
            .split('-')
    )
    ].join('-').replace(/--/g, '-')
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
    const REPLACEMENT = {
        'use_case': "uc",
        'machine_learning': "ml"
    }
    //Remove duplicate, replace useless elements
    let result = [...new Set(data.split('_'))].filter(f => f.length > 0 && !['diagram', 'legacy', 'new', 'library'].includes(f.toLowerCase()))
    //Too long
    if (data.length > 20) {
        result = result.slice(0, 2)
    }
    // Replace groups
    result = result.join('_')
    Object.keys(REPLACEMENT).forEach(m => {
        if (result.indexOf(m) > -1) {
            result = result.replace(m, REPLACEMENT[m])
        }
    })
    return result
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
export function regexpProcess(REGEXP_EXAMPLE, content, processor = fromExamples, title = '', global_prefix = '', increment = true) {
    let m
    let snippets = {}
    let index = 0
    while ((m = REGEXP_EXAMPLE.exec(content)) !== null) {
        if (m.index === REGEXP_EXAMPLE.lastIndex) {
            REGEXP_EXAMPLE.lastIndex++;
        }
        let puml = m.groups
        //Reformat puml attributes
        if (!puml.title) puml.title = title
        if (!puml.prefix) puml.prefix = global_prefix.length > 0 ? clean(global_prefix) : ''
        puml.title = clean(puml.title)
        if (puml.type) puml.type = puml.type.substring(0, 3)

        //Generate snippets template
        let data = processor(puml)
        if (data.body) {
            index++
            if (index > 0 && increment) {
                //Increment index for same entry key
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
 * A function to generate a new object based on the input puml.
 *
 * @param {type} puml - the input puml
 * @return {type} the generated object
 */
export function fromExamples(puml) {
    let title = puml.prefix.trim().length > 2 ? puml.prefix + SEP + puml.title : puml.title
    let prefix = puml.prefix.trim().length > 2 ? truncate(puml.prefix) + SEP + truncate(puml.title) : truncate(puml.title)
    return {
        "title": title,
        "prefix": `p${puml.type}${SEP}${prefix}`,
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
export function fromCode(puml) {
    let title = puml.prefix
    return {
        "title": title,
        "prefix": puml.prefix,
        "body": puml.prefix + '(' + puml.params.split(',').map((m, i) => `\$\{${i}:${m.trim()}\}`).join(',') + ')',
        "description": puml.body
    }
}
