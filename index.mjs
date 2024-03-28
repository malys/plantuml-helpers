/***
 * Generate autocompletion for VSCode "complete from files" and snippets from public plantuml documentation
 */
import 'zx/globals'
import { cleanFolders, OUTPUT_FOLDER, FASTKEYS_FOLDER } from './libs/folders.mjs';
import { LOG_CONCLUSION, LOG_FAIL } from './libs/logs.mjs';
import { SEP } from './libs/processor.mjs'
import stdlibGenerator from './libs/step_stdlib.mjs';
import pdfGenerator from './libs/step_officialpdf.mjs';
import themesGenerator from './libs/step_theme.mjs';

$.verbose = false
$.noquote = async (...args) => {
    const q = $.quote;
    $.quote = v => v;
    const p = $(...args);
    await p;
    $.quote = q;
    return p
}

cleanFolders()

let snippets = {}

console.log(LOG_CONCLUSION(`==================================== STDLIB ====================================`));
await stdlibGenerator(snippets)
let snip1 = Object.keys(snippets).length
console.log(LOG_CONCLUSION(`Snippets generated: ${snip1}`));

console.log(LOG_CONCLUSION(`==================================== THEME ====================================`));
await themesGenerator(snippets)
let snip2 = Object.keys(snippets).length
console.log(LOG_CONCLUSION(`Snippets generated: ${snip2 - snip1}`));

console.log(LOG_CONCLUSION(`==================================== GUIDE ====================================`));
await pdfGenerator(snippets)
let snip3 = Object.keys(snippets).length
console.log(LOG_CONCLUSION(`Snippets generated: ${snip3 - snip2}`));
console.log(LOG_CONCLUSION(`Total Snippets generated: ${snip3}`));

//Export

//VSCode snippets
//Sorting snippets
Object.keys(snippets).sort().reduce((obj, key) => {
    obj[key] = snippets[key];
    return obj;
}, {});
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

if (snip3 < 11000) {
    console.log(LOG_FAIL('Something went wrong. Not enough snippets generated.'))
    process.exit(1)
}
