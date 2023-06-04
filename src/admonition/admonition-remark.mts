import { h } from 'hastscript';
import markdown from 'remark-parse';
import { unified } from 'unified';
// remark-custom-blocks.js
import { visit } from 'unist-util-visit';

export function RemarkAdmonition() {
  function transformer(tree : any) {
    visit(tree, 'paragraph', (node, index, parent) => {
      const firstChild = node.children[0];

      if (
        firstChild &&
        firstChild.type === 'text'
      ) {
        const keywordMatch = firstChild.value.match(/^:::(info|note|tip|caution|danger)/);

        if (keywordMatch) {
          const keyword = keywordMatch[1];

          // Extract the title
          const titleMatch = firstChild.value.match(/^:::(info|note|tip|caution|danger)\s+(.*)$/);
          const title = titleMatch ? titleMatch[2] : '';

          // Remove the keyword from the first child's value
          firstChild.value = firstChild.value.replace(/^:::(info|note|tip|caution|danger)\s*/, '');

          // Find the closing ':::' marker
          const idx = index ?? 0
          const closingIndex = parent.children.slice(idx + 1).findIndex((child : any) => {
            return child.type === 'paragraph' && child.children[0] && child.children[0].value === ':::';
          });

          if (closingIndex === -1) {
            return;
          }

          const endIndex = idx + 1 + closingIndex;
          const contentNodes = parent.children.slice(idx + 1, endIndex);

          // Parse the contentNodes as markdown
          const contentProcessor = unified().use(markdown);
          const contentTree = contentProcessor.runSync({ type: 'root', children: contentNodes });

          const customBlockNode = {
            type: `${keyword}Block`,
            data: {
              hName: 'div',
              hProperties: {
                admonition: "true",
                "admonition-type": keyword,
                // title: title, // Include the title property
              },
            },
            children: contentTree.children,
          };

          parent.children.splice(index, endIndex - idx + 1, customBlockNode);
        }
      }
    });
  }
  return transformer;
}

export function hasAdmonition(content: string) : boolean {
  const pattern = /:::(info|note|tip|caution|danger)[\s\S]*?:::/;
  return pattern.test(content);
}