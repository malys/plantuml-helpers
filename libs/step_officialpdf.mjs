import pdf from "pdf-parse-fork";
import 'zx/globals'
import { regexpProcess, fromExamples } from './processor.mjs'
import { OUTPUT_FOLDER } from './folders.mjs'

/**
 * Generates autocompletion files from PlantUML Language Reference Guide
 */
async function pdfGenerator(snippets) {
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
export default pdfGenerator;