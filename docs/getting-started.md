---

title: Getting Started
level: 1

---

# Getting Started

## Install squarified

First, download and install this package from [npm](https://docs.npmjs.com/cli/v8/commands/npm-install)

```shell
$ npm install squarified
```

## The first application

This is a simple example of how to use it. Create a new file named `index.html` and `pre.js` in the same directory.
copy and paste the following code into the files respectively and then run the `index.html` by a static server. (such as `npx http-server`)

```html
<!DOCTYPE html>
     <html lang="en">
       <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>Squarified</title>
         <style>
           #app, html, body {
             width: 100%;
             height: 100vh;
           }
         </style>
       </head>
       <body>
         <div id="app"></div>
         <script src="pre.js"></script>
       </body>
     </html>
```

```js
// pre.js
import { createTreemap } from 'squarified'
import { presetColorPlugin } from 'squarified/plugin'
const data = [{
  name: 'root',
  weight: 100,
  groups: [
    { name: 'a', weight: 10 },
    { name: 'b', weight: 20 },
    { name: 'c', weight: 30 },
    { name: 'd', weight: 40 }
  ]
}]
const treemap = createTreemap({ plugins: [presetColorPlugin] })
const el = document.getElementById('app')
treemap.init(el)
treemap.setOptions({ data })
```
