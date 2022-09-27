# JavaScript/WebGL lightweight object detection and tracking library for WebAR


<p align="center">
<a href='https://youtu.be/a09NSXp_ENU'><img src='https://img.youtube.com/vi/a09NSXp_ENU/0.jpg'></a>
<br/>
<i><a href='https://webar.rocks/demos/object/demos/threejs/ARCoffee/' target='_blank'>Standalone AR Coffee</a> - Enjoy a free coffee offered by <a href='https:/webar.rocks'>WebAR.rocks</a>!<br/>
  The coffee cup is detected and a 3D animation is played in augmented reality.<br/>
  This demo only relies on WebAR.rocks.object and THREE.JS.</i>
</p>



## Table of contents

* [Features](#features)
* [Object specifications](#object-specifications)
  * [Target object dimensions](target-object-dimenion)
  * [3D Model](#3d-model) 
* [Architecture](#architecture)
* [Demonstrations](#demonstrations)
  * [Standalone static JS demos](#standalone-static-js-demos)
  * [WebXR viewer demos](#webxr-viewer-demos)
* [Specifications](#specifications)
  * [Get started](#get-started)
  * [Initialization arguments](#initialization-arguments)
  * [The Detection function](#the-detection-function)
    * [Arguments](#arguments)
    * [Return value](#return-value)
    * [Asynchronous function](asynchronous-function)
  * [Other methods](#other-methods)
  * [Video cropping](#video-cropping)
  * [Scan settings](#scan-settings)
  * [WebXR integration](#webxr-integration)
  * [Error codes](#error-codes)
  * [Hosting](#hosting)
  * [Using the ES6 module](#using-the-es6-module)
* [Neural network models](#neural-network-models)
* [About the tech](#about-the-tech)
  * [Under the hood](#under-the-hood)
  * [Compatibility](#compatibility)
* [License](#license)
* [References](#references)


## Features

Here are the main features of the library:

* object detection
* camera video feed capture using a helper
* on the fly neural network change
* demonstrations with [WebXR](https://blog.mozilla.org/blog/2017/10/20/bringing-mixed-reality-web/) integration


## Object specifications

The training of a specific neural network to detect and track a targeted object (or several objects) is not included in the entry fee or license fee of this repository.

We train the neural network from a 3D model The training can last from 1 week to 2 months depending on the complexity of the use-case. Contact-us to get a proposal for you specific use-case.


### Target object dimensions

The target object needs to have an aspect ratio between 1/2.5 and 2.5. An object with an aspect ratio of 1 fits into a square (same width and same height). For example a standard Redbull can aspect ratio is 2.5 (height / diameter).

Elongated objects like a fork, a pen, a knife don’t match this requirement. In this case it can be easier to target only a specific part of the object (like the end of the fork).
We only detect objects fully fitting in the field of view of the camera (i.e. not partially visible).
We can train a neural network to detect up to 3 different objects simultaneously. The first detected object will then be tracked (we currently don’t handle simultaneous multi-object tracking). The recognized objects should have approximately the same aspect ratio.

Highly reflective objects are harder to detect (like shiny metallic objects).

### 3D model

We don’t need any picture of the object but a 3D model.
The 3D model should be in one of these file format: .OBJ, .GLTF, .GLB. The textures should have Power Of Two dimensions and their higher dimensions should be equal or less than 1024 pixels.

The 3D model should include the PBR textures if necessary (typically the metallic-roughness texture).

We can provide 3D modelling support.


## Architecture

* `/demos/`: source code of the demonstrations,
* `/dist/`: heart of the library: 
  * `WebARRocksObject.js`: main minified script,
* `/helpers/`: scripts which can help you to use this library in some specific use cases (like WebXR),
* `/libs/`: 3rd party libraries and 3D engines used in the demos,
* `/neuralNets/`: neural network models,
* `/reactThreeFiberDemos`: Demos with Webpack/NPM/React/Three Fiber.

## Demonstrations

### Standalone static JS demos

These demonstrations work in a standard web browser. They only require camera access.
They are written in static JavaScript

* Simple object recognition using the camera (for debugging): [live demo](https://webar.rocks/demos/object/demos/debugDetection/) [source code](/demos/debugDetection/)
* Cat recognition: [live demo](https://webar.rocks/demos/object/demos/cat/) [source code](/demos/cat/) [Youtube video](https://www.youtube.com/watch?v=MqvweemM_-I)
* THREE.js Sprite 33cl (12oz) can detection demo: [source code](/demos/threejs/sprite/) [live demo](https://webar.rocks/demos/object/demos/threejs/sprite/)
* Standalone AR Coffee demo: [source code](/demos/threejs/ARCoffee) [live demo](https://webar.rocks/demos/object/demos/threejs/ARCoffee/) [Youtube video](https://youtu.be/a09NSXp_ENU)
* Keyboard detection and tracking demo: [source code](/demos/threejs/keyboard/) [live demo](https://webar.rocks/demos/object/demos/threejs/keyboard/). [Coffee on keyboard demo](https://webar.rocks/demos/coffeeKeyboard/)

### Standalone ES6 demos

These demonstrations have been written in a modern front-end environment using:
* NPM/Webpack/Babel/ES6 as enviromnent
* React 
* Three.js through Three Fiber
You can browse adn try them in the [/reactThreeFiberDemos](/reactThreeFiberDemos) directory.

### WebXR viewer demos

To run these demonstrations, you need a web browser implementing WebXR. We hope it will be implemented soon in all web browsers! 
* If you have and IOS device (Ipad, Iphone), you can install [WebXR viewer](https://itunes.apple.com/us/app/webxr-viewer/id1295998056?mt=8) from the Apple store. It is developped by the Mozilla Fundation. It is a modified Firefox with WebXR implemented using ArKit. You can then open the demonstrations from the URL bar of the application.
* For Android devices, it should work with [WebARonARCore](https://github.com/google-ar/WebARonARCore), but we have not tested yet. Your device should still be compatible with *ARCore*.

Then you can run these demos:
* WebXR object labelling: [live demo](https://webar.rocks/demos/object/demos/webxr/) [source code](/demos/webxr/)
* WebXR coffee: [live demo](https://webar.rocks/demos/object/demos/webxrCoffee/) [source code](/demos/webxrCoffee/) [Youtube video](https://youtu.be/9klHhWxZHoc)


## Specifications

### Get started

The most basic integration example of this library is the first demo, the [debug detection demo](/demos/debugDetection/).
In `index.html`, we include in the `<head>` section the main library script, `/dist/WebARRocksObject.js`, the `MediaStramAPI` (formerly called `getUserMedia API`) helper, `/helpers/WebARRocksMediaStreamAPIHelper.js` and the demo script, `demo.js`:

```html
<script src = "../../dist/WebARRocksObject.js"></script>
<script src = "../../helpers/WebARRocksMediaStreamAPIHelper.js"></script>
<script src = "demo.js"></script>
```

In the `<body>` section of `index.html`, we put a `<canvas>` element which will be used to initialize the WebGL context used by the library for deep learning computation, and to possibly display a debug rendering:

```html
<canvas id = 'debugWebARRocksObjectCanvas'></canvas>
```


Then, in `demo.js`, we get the camera video feed after the loading of the page using the `MediaStream API` helper:

```javascript
WebARRocksMediaStreamAPIHelper.get(DOMVIDEO, init, function(){
  alert('Cannot get video bro :(');
}, {
  video: true //mediaConstraints
  audio: false
})
```

You can replace this part by a static video, and you can also provide [Media Contraints](https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints) to specify the video resolution.
When the video feed is captured, the callback function `init` is launched. It initializes this library:

```javascript
function init(){

  WEBARROCKSOBJECT.init({
    canvasId: 'debugWebARRocksObjectCanvas',
    video: DOMVIDEO,
    callbackReady: function(errLabel){
      if (errLabel){
        alert('An error happens bro: ',errLabel);
      } else {
        load_neuralNet();
      }
    }
  });

}
```

The function `load_neuralNet` loads the neural network model:

```javascript
function load_neuralNet(){
  WEBARROCKSOBJECT.set_NN('../../neuralNets/NN_OBJ4_0.json', function(errLabel){
    if (errLabel){
      console.log('ERROR: cannot load the neural net', errLabel);
    } else {
      iterate();
    }
  }, options);
}
```
Instead of giving the URL of the neural network, you can also give the parsed JSON object.


The function `iterate` starts the iteration loop:

```javascript
function iterate(){
  const detectState = WEBARROCKSOBJECT.detect(3);
  if (detectState.label){
    console.log(detectState.label, 'IS DETECTED YEAH !!!');
  }
  window.requestAnimationFrame(iterate);
}
```

### Initialization arguments

The `WEBARROCKSOBJECT.init` takes a dictionary as argument with these properties:
* `<video> video`: HTML5 video element (can come from the MediaStream API helper). If `false`, update the source texture from a `videoFrameBuffer object` provided when calling `WEBARROCKSOBJECT.detect(...)` (like in WebXR demos),
* `<dict> videoCrop`: see [Video cropping section](#video-cropping) for more details
* `<function> callbackReady`: callback function launched when ready or if there was an error. Called with the error label or `false`,
* `<string> canvasId`: id of the canvas from which the WebGL context used for deep learning processing will be created,
* `<canvas> canvas`: if `canvasId` is not provided, you can also provide directly the `<canvas>` element
* `<dict> scanSettings`: see [Scan settings section](#scan-settings) for more details
* `<boolean> isDebugRender`: Boolean. If true, a debug rendering will be displayed on the `<canvas>` element. Useful for debugging, but it should be set to `false` for production because it wastes GPU computing resources,
* `<int> canvasSize`: size of the detection canvas in pixels (should be square). Special value `-1` keep the canvas size. Default: `512`.
* `<boolean> followZRot`: only works with neural network models outputing pitch, roll and yaw angles. Crop the input window using the roll of the current detection during the tracking stage,
* `[<float>, <float>] ZRotRange`: only works if `followZRot = true`. Randomize initial rotation angle. Values are in radians. Default: `[0,0]`.


### The Detection function

#### arguments

The function which triggers the detection is `WEBARROCKSOBJECT.detect(<int>nDetectionsPerLoop, <videoFrame>frame, <dictionary>options)`.
* `<int> nDetectionPerLoop` is the number of consecutive detections proceeded. The higher it is, the faster the detection will be. But it may slow down the whole application if it is too high because the function call will consume too much GPU resources. A value between `3` and `6` is advised. If the value is `0`, the number of detection per loop is adaptative between `1` and `6` with an initial value of `3`,
* `<videoFrame> frame` is used only with WebXR demos (see [WebXR integration section](#webxr-integration)). Otherwise set it to `null`,
* `<dictionary> options` is an optional dictionary which can have these properties:
  * `<float> thresholdDetectFactor`: a factor applied on the detection thresholds for the detected object. The default value is `1`. For example if it equals `0.5`, the detection will be 2 times easier.
  * `<string> cutShader`: Tweak the default shader used to crop the video area. The possible values are:
    * For WebXR viewer demos:
      * `null`: default value, does not apply a filter and keep RGBA channels,
      * `IOS`: value optimized of IOS devices for WebXR usage only. Copy the red channel into the other color channels and apply a 5 pixels median filter
    * For default use:
      * `median`: apply a 3x3 median filter on RGB channels separately,
      * `null`: default value, does not apply a filter and keep RGBA channels
  * `<boolean> isSkipConfirmation`: makes detection easier (more sensitive) but can trigger more false positives. Default: `false`,
  * `<boolean> isKeepTracking`: If we should keep tracking an object after its detection. Default: `false`,
  * `[<float>,<float>,<float>] trackingFactors`: tracking sensitivity for translation along X,Y axis and scale. Default: `1.0`,
  * `<float> thresholdDetectFactorUnstitch`: stop tracking if detection threshold is below this value. Used only if `isKeepTracking=true`. Should be smaller than `thresholdDetectFactor`,
  * `<float> secondNeighborFactor`: Do not confirm an object if another object has a detection score of at least `secondNeighborFactor * objectDetectionScore`. Default value is `0.7`,
  * `<int> nLocateAutomoves`: number of detection step in the `LOCATE` stage (juste move the input detection window with noise) (default: `10`),
  * `<float> locateMoveNoiseAmplitude`: noise during the `LOCATE` stage, relative to input window dimensions (default: `0.01`),
  * `<int> nConfirmAutoMoves`: number of detection steps during the `CONFIRM` stage (default: `8`),
  * `<float> thresholdConfirmOffset`: abord CONFIRM stage if detection score is below the object detection threshold + this value (default: `-0.02`),
  * `<float> confirmMoveNoiseAmplitude`: noise during the `CONFIRM` stage, relative to input window dimensions (default: `0.01`),
  * `<int> nConfirmUnstitchMoves`: in keep tracking mode (`isKeepTracking = true`, stop the tracking after this number of unsuccessful detections (default: `20`),
  * `[<float> position, <float> angle]`: if ambiguous detection (2 objects have close scores) during the `CONFIRM` stage, tilt the input window. First value is relative to window dimensions, the second is the angle in degrees ( default: `[0.1, 10]`),
  * `<float> confirmScoreMinFactorDuringAutoMove`: During confirm stage, minimum score for each move. If the score is smaller than this value, come back to the sweep stage. Default is `0.3`.
    

#### return value

The detection function returns an object, `detectState`. For optimization purpose it is assigned by reference, not by value. It is a dictionary with these properties:
* `<float> distance`: learning distance, ie distance between the camera and the object during the training of the dataset. Gives a clue about the real scale of the object,
* `<bool/string> label`: `false` if no object is detected, otherwise the label of the detected object. It is always in uppercase letters and it depends on the neural network,
* `<array4> positionScale`: array of floats storing 4 values: `[x,y,sx,sy]` where `x` and `y` are the normalized relative positions of the center of the detected object. `sx`, `sy` are the relative normalized scale factors of the detection window:
  * `x` is the position on the horizontal axis. It goes from `0` (left) to `1` (right),
  * `y` is the position on the vertical axis. It goes from `0` (bottom) to `1` (top),
  * `sx` is the scale on the horizontal axis. It goes from `0` (the size is null) to `1` (full size on horizontal axis),
  * `sy` is the scale on the vertical axis. It goes from `0` (null size) to `1` (full size on vertical axis),
* `<float> yaw`: the angle in radian of the rotation of the object around the vertical (Y) axis,
* `<float> detectScore`: detection score of the detected object, between `0` (bad detection) and `1` (very good detection).

#### Asynchronous function

There is an asynchronous function similar to `WEBARROCKSOBJECT.detect()`, `WEBARROCKSOBJECT.detect_async()`. It returns a JavaScript *Promise* resolved with the `detectState` object. Although the use of this feature may slow down a bit the detection rate, it will use far less CPU computing power. Indeed, we don't run blocking calls of `GL.readPixels(...)`, forcing the synchronisation between the CPU and the GPU. This feature is effective only for WebGL2 compatible devices. This is how to use it:

```javascript
function iterate(){
  WEBARROCKSOBJECT.detect_async(3).then(function(detectState){
    if (detectState.label){
      console.log(detectState.label, 'IS DETECTED YEAH !!!');
    }
    window.requestAnimationFrame(iterate);
  });  
}
```

### Other methods

* `WEBARROCKSOBJECT.set_NN(<string> neuralNetworkPath, <function> callback)`: switches the neural network, and call a function when it is finished, either with `false` as argument or with an error label,
* `WEBARROCKSOBJECT.reset_state()`: returns to sweep mode,
* `WEBARROCKSOBJECT.get_aspectRatio()`: returns the aspect ratio `<width>/<height>` of the input source,
* `WEBARROCKSOBJECT.set_scanSettings(<dict> scanSettings)`: see [Scan settings section](#scan-settings) for more informations.
* `WEBARROCKSOBJECT.destroy()`: Clear both graphic memory and JavaScript memory, uninit the library. After that you need to init the library again. A `Promise` is returned.

### WebXR integration

The WebXR demos principal code is directly in the `index.html` files. The 3D part is handled by *THREE.JS*.
The starting point of the demos is the examples provided by [WebXR viewer by the Mozilla Fundation]([github repository of demos](https://github.com/mozilla/webxr-polyfill/tree/master/examples)).

We use *WebAR.rocks.object* through a specific helper, `helpers/WebARRocksWebXRHelper.js` and we strongly advise to use this helper for your WebXR demos.
With the IOS implementation, it handles the video stream conversion (the video stream is given as *YCbCr* buffers. We take only the *Y* buffer and we apply a median filter on it.).



### Error codes

* Initialization errors (returned by `WEBARROCKSOBJECT.init` `callbackReady` callback):
  * `"GL_INCOMPATIBLE"`: WebGL is not available, or this WebGL configuration is not enough (there is no WebGL2, or there is WebGL1 without OES_TEXTURE_FLOAT or OES_TEXTURE_HALF_FLOAT extension),
  * `"ALREADY_INITIALIZED"`: the API has been already initialized,
  * `"GLCONTEXT_LOST"`: The WebGL context was lost. If the context is lost after the initialization, the `callbackReady` function will be launched a second time with this value as error code,
  * `"INVALID_CANVASID"`: cannot found the `<canvas>` element in the DOM. This error can be triggered only if `canvasId` is provided to the `init()` method.
* Neural network loading errors (returned by `WEBARROCKSOBJECT.set_NN` callback function):
  * `"INVALID_NN"`: The neural network model is invalid or corrupted,
  * `"NOTFOUND_NN"`: The neural network model is not found, or a HTTP error occured during the request.  



### Video cropping

The video crop parameters can be provided. It works only if the input element is a `<video>` element. By default, there is no video cropping (the whole video image is taken as input). The video crop settings can be provided:
* At the initialization process,  when `WEBARROCKSOBJECT.init` is called, using the parameter `videoCrop`,
* After the initialization, by calling `WEBARROCKSOBJECT.set_videoCrop(<dict> videoCrop)`

The dictionnary `videoCrop` is either false (no videoCrop), or has the following parameters:
* `<int> x`: horizontal position of the lower left corner of the cropped area, in pixels,
* `<int> y`: vertical position of lower left corner of the cropped area, in pixels,
* `<int> w`: width of the cropped area, in pixels,
* `<int> h`: height of the cropped area, in pixels.


### Scan settings

Scan settings can be provided:
* At the initialization process, when `WEBARROCKSOBJECT.init` is called, using the parameter `scanSettings`
* After the initialization, by calling `WEBARROCKSOBJECT.set_scanSettings(<dict> scanSettings)`

The dictionnary `scanSettings` has the following properties:

* `<int> nScaleLevels`: number of detection steps for the scale. Default: `3`,
* `[<float>, <float>, <float>] overlapFactors`: overlap between 2 scan positions for `X`, `Y` and `scale`. Default: `[2, 2, 3]`,
* `<float> scale0Factor`: scale factor for the largest scan level. Default is `0.8`.


### Hosting

The demonstrations should be hosted on a static HTTPS server with a valid certificate. Otherwise WebXR or MediaStream API may not be available.

Be careful to enable gzip compression for at least JSON files. The neuron network model can be quite heavy, but fortunately it is well compressed with GZIP.

Some directories of the latest version of this library are hosted on `https://cdn.webar.rocks/object/` and served through a content delivery network (CDN):

* [/dist](/dist/)
* [/helpers](/helpers/)

### Using the ES6 module

`/dist/WebARRocksObject.module.js` is exactly the same than `/dist/WebARRocksObject.js` except that it works with ES6, so you can import it directly using:

```javascript
import 'dist/WebARRocksObject.module.js'
```



## Neural network models

We provide several neural network models in the [/neuralNets/](/neuralNets/) path. We will regularly add new neural networks in this Git repository. We can also provide specific neural network training services. Please [contact us at contact_at_webar.rocks](mailto:contact@webar.rocks) for pricing and details. You can find here:

| model file    		   | detected labels 			    | input size   | detection cost | reliability | standalone (6DoF) | remarks |
| :---         			   | :---        				      | :---         |     :---:      |     :---:   |     :---:   |  :---   |
| `NN_OBJ4_0.json`   		 | CUP,CHAIR,BICYCLE,LAPTOP |  128*128px   | **			        |     **      | No |  |
| `NN_OBJ4LIGHT_0.json`   | CUP,CHAIR,BICYCLE,LAPTOP |  64*64px     | *				      |      *      | No |  |
| `NN_CAT_0.json`           | CAT                      |  64*64px     | ***            |      ***    | No | detect cat face  |
| `NN_SPRITE_0.json`              | SPRITECAN                |  128*128px   | ***            |      ***    | Yes |  |
| `NN_COFFEE_<X>.json` | CUP                |  64*64px   | **            |      ***    |  Yes |   |
| `NN_KEYBOARD_<X>.json` | KEYBOARD                |  128*128px   | **            |      ***    | Yes |   |


The input size is the resolution of the input image of the network. The detection window is not static: it slides along the video both for position and scale. If you use this library with WebXR and IOS, the video resolution will be `480*270` pixels, so a `64*64` pixels input will be enough. If for example you used a `128*128` pixels input neural network model, the input image would often need to be enlarged before being given as input.


## About the tech

### Under the hood

This library relies on WebAR.rocks WebGL Deep Learning technology to detect objects. The neural network is trained using a 3D engine and a dataset of 3D models. All is processed client-side.

### Compatibility

* If `WebGL2` is available, it uses `WebGL2` and no specific extension is required,
* If `WebGL2` is not available but `WebGL1`, we require either `OES_TEXTURE_FLOAT` extension or `OES_TEXTURE_HALF_FLOAT` extension,
* If `WebGL2` is not available, and if `WebGL1` is not available or neither `OES_TEXTURE_FLOAT` or `OES_HALF_TEXTURE_FLOAT` are implemented, the user is not compatible.

If a compatibility error is triggered, please post an issue on this repository. If this is a problem with the camera access, please first retry after closing all applications which could use your device (Skype, Messenger, other browser tabs and windows, ...). Please include:
* a screenshot of [webglreport.com - WebGL1](http://webglreport.com/?v=1) (about your `WebGL1` implementation),
* a screenshot of [webglreport.com - WebGL2](http://webglreport.com/?v=2) (about your `WebGL2` implementation),
* the log from the web console,
* the steps to reproduce the bug, and screenshots.


## License

This code repository is dual licensed. You have to choose between these 2 licenses:

1. [GPLv3](GPLv3.txt) (free default option)
2. [Nominative commercial license](https://webar.rocks/buyCommercialLicense) (not free)

For more information, please read [LICENSE](/LICENSE) file.


## References

* [ObjectNet3D, dataset used for training](http://cvgl.stanford.edu/projects/objectnet3d/)
* [WebAR.rocks website](https://webar.rocks)
* [WebXR specifications draft](https://immersive-web.github.io/webxr/)
* WebXR for iOS by the Mozilla Fundation: [github repository of the viewer](https://github.com/mozilla-mobile/webxr-ios), [WebXR viewer on Apple Appstore](https://itunes.apple.com/us/app/webxr-viewer/id1295998056), [github repository of demos](https://github.com/mozilla/webxr-polyfill)
* [MDN Media Streams API MediaConstraints doc](https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints)
* [Webgl Academy: interactive tutorials about WebGL and THREE.JS](http://www.webglacademy.com)
* [WebAR.rocks on Linkedin](https://www.linkedin.com/company/webar-rocks)
* [WebAR.rocks on Twitter](https://twitter.com/WebARRocks)