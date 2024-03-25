cd /B/prog/code/plantuml-helpers/
rm -rf release
ZIP=vscode-helpers.zip
URL=$(curl -s https://api.github.com/repos/malys/plantuml-helpers/releases/latest | grep "browser_download_url" | cut -d : -f 2,3 | tr -d \" )
echo Downloading $URL
curl -qLk $URL -o $ZIP
"/c/Program Files/Bandizip/bc.exe"  x -target:auto -o:./release -y $ZIP
rm $ZIP

SOURCE_PATH=B:\\prog\\code\\plantuml-helpers\\release\\vscode-helpers\\

declare -a TARGET_PATH=("B:\\prog\\code\\plantuml-helpers\\.vscode\\" "B:\\prog\\nodejs\\malys.github.io-\\.vscode\\")
for i in "${TARGET_PATH[@]}"
do
nyagos -C rm -f "${i}plantuml-helpers"
nyagos -C rm -f "${i}plantuml.code-snippets"
nyagos -C mklink "${i}plantuml-helpers" "${SOURCE_PATH}plantuml-helpers\\"
nyagos -C mklink "${i}plantuml.code-snippets" "${SOURCE_PATH}plantuml.code-snippets"
done
exit