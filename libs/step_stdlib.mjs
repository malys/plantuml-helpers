import stdlibGenerator from './stdlib.mjs'
async function generator(snippets) {
    const REPOSITORY="https://github.com/plantuml/plantuml-stdlib"
    const LIB_NAME="plantuml-stdlib"
    const GIT_ROOT_FOLDER=`${LIB_NAME}/stdlib`
    const README=`${LIB_NAME}/README.md`

    return stdlibGenerator(snippets,LIB_NAME,REPOSITORY,README,GIT_ROOT_FOLDER)
}

export default generator;

