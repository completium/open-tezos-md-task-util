import { hasAdmonition, rehypeAdmonition, RemarkAdmonition } from './admonition.mjs'
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
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { hasKatex, katexStyle } from './katex.mjs'
import juice  from 'juice'

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
  hasUserTests: false, // can user build tests
  testMode: false,
  limits : {
    "*": {time: 60000, memory: 60000}
  }
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
    <link class="task" type="text/css" rel="stylesheet" href="../../_common/modules/pemFioi/progTask.css">
    <link class="task" type="text/css" rel="stylesheet" href="../../_common/modules/ext/bootstrap/css/bootstrap.min.css">
    <script class="remove" src="../../_common/modules/ext/requirejs/require.js"></script>
    <script type="text/javascript">
      var modulesPath ='../../_common/modules';
      var taskPlatformPath ='../../_common/task-platform';
    </script>
    <script type="text/javascript" src="../../_common/modules/pemFioi/progTaskConfig-1.0.js"></script>
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
    </script>
    ${styles}
  </head>
  <body ng-controller="taskController">
    <div id="task">
      ${body}
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
    remarkPlugins: [remarkFrontMatter, remarkGfm, remarkCode, RemarkAdmonition, remarkMath],
    rehypePlugins: [rehypeHighlight, addLinkAttributes, generateAttributesFromTitle, rehypeAdmonition, rehypeKatex]
  }).default

  return renderToString(createElement(mdx))
}

const path = getPath()
const content = getFileContentSync(path)
const matter = await getMatter(path)
const body = generate(content)

function getStyles(content : string) : string {
  let admonition = ""
  if (hasAdmonition(content)) {
    //admonition = "<link type=\"text/css\" rel=\"stylesheet\" href=\"../_local_common/admonition.min.css\">"
    admonition = "<style>" + getFileContentSync(getPathForResource("../src/admonition.css"))  + "</style>"
  }
  let katex = ""
  if (hasKatex(content)) {
    //katex = "<link rel=\"stylesheet\" href=\""+ katexStyle + "\" />"
    katex = "<style>" + getFileContentSync(getPathForResource("../src/katex.css"))  + "</style>"
  }
  return admonition + katex
}

console.log(juice(getHTML(getStyles(content), getPEMTaskMetaData(matter), body)))
