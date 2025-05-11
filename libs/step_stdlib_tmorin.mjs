import stdlibGenerator from "./stdlib.mjs";
async function generator(snippets) {
  const REPOSITORY = "https://github.com/tmorin/plantuml-libs";
  const LIB_NAME = "tmorin";
  const GIT_ROOT_FOLDER = `${LIB_NAME}/distribution`;
  const FILTER="!(*Remote|*Local)"
  const REPLACE={from:".Remote",to:""}
  const README=`${GIT_ROOT_FOLDER}/README.md`
  return stdlibGenerator(snippets, LIB_NAME, REPOSITORY,README, GIT_ROOT_FOLDER,FILTER,REPLACE);
}

export default generator;
