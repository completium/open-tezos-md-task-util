This utility generates an html file from a MD file for an open-tezos task.

## Install

```
npm i -g @completium/open-tezos-md-task-util@latest
```

## Run

The package installs the binary `mdtask2html`:

```
$ mdtask2html test.md > index.html
```

## Features

### FrontMatter

It supports frontMatter style PEM task medata. For example:

```
---
id : example
authors : [john.doe@mycompany.com]
---

# MD content here

```

PEM task metadata are defaulted to:
```json
{
  "license" : "MIT",
  "language" : "en",
  "version": "0.1",
  "baseUrl" : "",
  "supportedLanguages": ["michelson", "ligo", "mligo", "religo", "jsligo", "smartpy", "archetype"],
  "hasUserTests": "false",
  "testMode": "false",
  "limits" : {
    "*": {"time": "60000", "memory": "60000"}
  }
}
```

### Code

Language is specified with standard triple back quote followed by language id; for example:

    ```archetype
    archetype test

    variable counter : nat = 0
    ```

This is compiled to

```html
<div select-lang="archetype" data-lang="archetype" data-show-source="true" data-code="archetype test

variable counter : nat = 0">
</div>
```

### Links

It is possible to specify the language associated to a link by adding the language identifier after the url. For example, to display the link for archetype language:

    [doc](https://archetype-lang.org/ "archetype")

This is compiled to:

```html
<a href="https://archetype-lang.org/" target="_blank" rel="noopener noreferrer" select-lang="archetype" data-lang="archetype">doc</a>
```

### HTML tags

It supports basic html tags (`div`, `pre`, `code`, ...). For example to add the language selector:

```md
Choose your language : <div select-lang-selector="true" />
```


