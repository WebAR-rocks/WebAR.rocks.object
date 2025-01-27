# WebAR.rocks.object react fiber demos


## Presentation

This directory is fully standalone, that's why it is not in the [/demos](/demos) path like other demonstrations.


## Quick start

To test it, run from this path:

```
nvm use 22
npm install
npm run start
```

It works with node >= 22.


### Production build

```bash
npm run build
```


## Dev notes

THREE.js is used through [Three Fiber](https://github.com/pmndrs/react-three-fiber).
We also use:
* [react-postprocessing](https://github.com/pmndrs/react-postprocessing)

Only the best demos have been ported to this development environment.

The main script and neural network models have been copied to [src/js/contrib/WebARRocksObject/dist](src/js/contrib/WebARRocksObject/dist) and [src/js/contrib/WebARRocksObject/neuralNets](src/js/contrib/WebARRocksObject/neuralNets).

The helpers have been modified compared to the static ones. They are in [src/js/contrib/WebARRocksObject/helpers](src/js/contrib/WebARRocksObject/helpers)