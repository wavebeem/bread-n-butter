- Should `bnb.language` exist? Is there a nice way to solve context sensitive languages without it? In the land of `const` and `let` is it really worth having `bnb.language` instead of just using `bnb.lazy` in a couple spots and letting the temporal deadzone prevent us from using variables to early on accident?

- `end` locations are one character too far when using `.node`

- should I use `readonly` arrays in return values? It kinda "infects" your types and you have to keep track of that when you make your own custom stuff

- Document other files

- Better template for TypeDoc?

- Better readme for TypeDoc?

- Add `tryParse` and update docs to use it?

- Show how to import bnb depending on environment (native ES Modules in the browser, module using Webpack, or plain old Node require)

- Get this on npm
