import { hasAdmonition, RemarkAdmonition } from './admonition/admonition-remark.mjs'
import { evaluateSync } from '@mdx-js/mdx'
import { readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import * as runtime from 'react/jsx-runtime'
import rehypeHighlight from 'rehype-highlight'
import remarkFrontMatter from 'remark-frontmatter'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { read } from 'to-vfile'
import { unified } from 'unified'
import { map, MapFunction } from 'unist-util-map'
import { visit } from 'unist-util-visit'
import { fileURLToPath } from 'url';
import { VFile } from 'vfile'
import { matter as vfileMatter } from 'vfile-matter'
import remarkMath from 'remark-math';
import { hasKatex, katexStyle } from './katex/katex.mjs'
import { languagesToDiv, linkToSpan } from './language.mjs'

const languages = ['michelson', 'ligo', 'mligo', 'religo', 'jsligo', 'smartpy', 'archetype']

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const DefaultPEMTaskMetaData = {
  // title is automatically fetched from the <title> markup
  license : 'MIT',
  language : "en",
  version: "0.1",
  baseUrl : "",
  supportedLanguages: languages,
  evaluationTags: ["tezos"],
  hasUserTests: false, // can user build tests
  testMode: false,
  limits : {
    "*": {time: 60000, memory: 60000}
  },
  common : "../../_common",
}

function getPEMTaskMetaData(data : any) {
  return { ...DefaultPEMTaskMetaData, ...data }
}

function getHTML(styles : string, pemTaskMetadata : any, body : string) : string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${pemTaskMetadata.title}</title>
    <script type="text/javascript">
      window.stringsLanguage = 'en';
      var modulesPath ='../../_common/modules';
    </script>
    <script class="remove" type="text/javascript" src="../../_common/modules/pemFioi/importModules-1.4-mobileFirst.js" id="import-modules"></script>
    <script type="text/javascript" class="remove">
      // general metadata conforming the PEM API Documentation for getMetaData
      var PEMTaskMetaData = ${JSON.stringify(pemTaskMetadata, null, 2)}

      // Metadata specific to the FranceIOI tasks
      var FIOITaskMetaData = {
        evalOutputScript: '',
        // This lists all possible languages
        // file extensions must follow the following conventions so that language is recognized automatically.
        // Additionally, a .txt file is recognized as 'pseudo' language
        solutionSources : {
//          "firstSource" : [ "sol.cpp",  "sol.c",  "sol.java",  "sol.jvs",  "sol.pas",  "sol.py" , "sol.ml"]
        },
        taskSamples : ['sample0'],
        graderSamples: ['test1','test2']
      }
      
      importModules(['smart-contract']);
    </script>
    <script id="animation">
       window.taskData = {
         gridInfos: {
           context: 'smart_contract',
           importModules: ['smart_contract_config'],
           conceptViewer: true,
           includeBlocks: {
             groupByCategory: true,
             standardBlocks: {
               wholeCategories: ['smart_contract_main_blocks', 'smart_contract_types'],
             },
           },
           // expectedStorage: "(nat %nb_calls)",
           // taskStrings: {
           //   "storageDescription": {
           //     "nb_calls": "it should contain the number of times make_call was called",
           //   },
           // },
         }
       };
     </script>
    ${styles}
  </head>
  <body id="app">
    <div id="react-container"></div>
    <div id="task">
      <div id="taskIntro">
        ${body}
      </div>
    </div>
  </body>
</html>
`
}

function isTitleLanguage(title : string | undefined) : boolean {
  if (title != undefined) {
    return languages.includes(title)
  }
  return false
}

function generateAttributesFromTitle() {
  return function (tree : any) {
    visit(tree, 'element', function (node) {
      if (node.tagName === 'a' && isTitleLanguage(node.properties.title)) {
        const titleValue = node.properties.title;

        // Generate new attributes
        node.properties['select-lang'] = titleValue;
        node.properties['data-lang'] = titleValue;

        // Optionally, remove the title attribute
        delete node.properties.title;
      }
    });
  };
}

function addLinkAttributes() {
  return function (tree : any) {
    visit(tree, 'element', function (node) {
      if (node.tagName === 'a') {
        node.properties.target = '_blank';
        node.properties.rel = 'noopener noreferrer';
      }
    });
  };
}

const mapCode : MapFunction<any> = (node : any) => {
  if (node.type == 'code') {
    const n = {
      "type": "mdxJsxFlowElement",
      "name": "div",
      "attributes": [
        {
          "type": "mdxJsxAttribute",
          "name": "select-lang",
          "value": node.lang,
        },
        {
          "type": "mdxJsxAttribute",
          "name": "data-lang",
          "value": node.lang,
        },
        {
          "type": "mdxJsxAttribute",
          "name": "data-show-source",
          "value": "true",
        },
        {
          "type": "mdxJsxAttribute",
          "name" : "data-code",
          "value" : node.value
        }
      ],
      "children": [],
      "data": {
        "_mdxExplicitJsx": true
      }
    }
    return n
  }
  return node
}

const remarkCode = () => (tree : any) => {
  return map(tree, mapCode)
}

async function getMatter(filepath : string) : Promise<{ [index:string] : string }> {
  const res = await unified()
    .use(remarkParse)
    .use(remarkStringify)
    .use(remarkFrontmatter)
    .use(() => {
      return function (_ : string, file : VFile) {
        vfileMatter(file)
      }
    })
    .process(await read(filepath))
  return res.data.matter as { [index:string] : string }
}

function getPath() : string {
  return join(process.cwd(), process.argv[2])
}

function getPathForResource(path : string) : string {
  return join(resolve(__dirname), path)
}

function getFileContentSync(filePath: string): string {
  try {
    const data = readFileSync(filePath);
    return data.toString();
  } catch (error) {
    console.error(`Error reading file from disk: ${error}`);
    return '';
  }
}

function generate (body: string) {
  const mdx = evaluateSync(body, {
    ...runtime as any,
    remarkPlugins: [remarkFrontMatter, remarkGfm, remarkCode, RemarkAdmonition, remarkMath, languagesToDiv, linkToSpan],
    rehypePlugins: [rehypeHighlight, addLinkAttributes, generateAttributesFromTitle]
  }).default

  return renderToString(createElement(mdx))
}

const path = getPath()
const content = getFileContentSync(path)
const matter = await getMatter(path)
const body = generate(content)

function getImports(content : string, matter : any) : string {
  let admonition_imports = ""
  if (hasAdmonition(content)) {
    admonition_imports += `<link type="text/css" rel="stylesheet" href="${matter.common}/modules/admonition/admonition.min.css"></link>`
    admonition_imports += `<script type="text/javascript" src="${matter.common}/modules/admonition/admonition-script.js"></script>`
  }
  let katex_imports = ""
  if (hasKatex(content)) {
    katex_imports += `<link type="text/css" rel="stylesheet" href="${matter.common}/modules/katex/katex.min.css"></link>`
    katex_imports += `<script defer type="text/javascript" src="${matter.common}/modules/katex/katex.min.js"></script>`
    katex_imports += `<script defer type="text/javascript" src="${matter.common}/modules/katex/katex-script.js"></script>`
  }
  return admonition_imports + katex_imports
}

console.log(getHTML(getImports(content, matter), getPEMTaskMetaData(matter), body))
