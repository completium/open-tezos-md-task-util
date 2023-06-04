import { visit } from 'unist-util-visit'
import { u } from 'unist-builder'

const tags = [
  'archetype',
  'smartpy',
  'michelson',
  'ligo',
  'mligo',
  'religo',
  'jsligo'
];

export function languagesToDiv() {
  return (tree : any) => {
    visit(tree, 'mdxJsxFlowElement', (node : any) => {
      if (tags.includes(node.name)) {
        const language = node.name
        node.name = 'div';
        node.attributes = [
          u('mdxJsxAttribute', { name: 'select-lang', value: language }),
          u('mdxJsxAttribute', { name: 'data-lang', value: language }),
        ];
      }
    });
  };
}

export function linkToSpan() {
  return (tree : any) => {
    visit(tree, 'link', (node, index, parent) => {
      const url = node.url || '';

      if (tags.includes(url)) {
        const newSpan = u('mdxJsxFlowElement', {
          name: 'span',
          attributes: [
            u('mdxJsxAttribute', { name: 'select-lang', value: url }),
            u('mdxJsxAttribute', { name: 'data-lang', value: url }),
          ],
          children: node.children
        });
        if (index)
        parent.children[index] = newSpan;
      }
    });
  };
}




