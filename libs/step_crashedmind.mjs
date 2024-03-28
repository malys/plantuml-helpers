import 'zx/globals'
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


export default snippetsGenerator;