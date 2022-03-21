const _settings = {
  nDetectsPerLoop: 0, // 0 -> adaptative

  loadNNOptions: {
    notHereFactor: 0.0,
    paramsPerLabel: {
      CUP: {
        thresholdDetect: 0.92
      }
    }
  },

  detectOptions: {
    isKeepTracking: true,
    isSkipConfirmation: false,
    thresholdDetectFactor: 1,
    cutShader: 'median',
    thresholdDetectFactorUnstitch: 0.2,
    trackingFactors: [0.5, 0.4, 1.5]
  },

  NNPath: '../../../neuralNets/NN_COFFEE_2.json',

  cameraFov: 0, // In degrees, camera vertical FoV. 0 -> auto mode
  scanSettings:{
    nScaleLevels: 2,
    scale0Factor: 0.8,
    overlapFactors: [2, 2, 2], // between 0 (max overlap) and 1 (no overlap). Along X,Y,S
    scanCenterFirst: true    
  },

  followZRot: true,

  displayDebugCylinder: false
};

// some globals:
let _DOMvideo = null;
let _isFirstDetection = true;


// entry point:
function main(){
  THREE.TeapotBufferGeometry = THREE.TeapotGeometry;

  _DOMvideo = document.getElementById('webcamVideo');
  WebARRocksMediaStreamAPIHelper.get(_DOMvideo, init, function(err){
    throw new Error('Cannot get video feed ' + err);
  }, {
    video: {
      // width:  {min: 640, max: 1280, ideal: 720},
      // height: {min: 640, max: 1280, ideal: 1024},
      facingMode: {ideal: 'environment'}
    },
    audio: false
 });
}


// executed when video is OK:
function init(){
  const ARCanvas = document.getElementById('ARCanvas');

  WebARRocksObjectThreeHelper.init({
    video: _DOMvideo,
    ARCanvas: ARCanvas,
    threeCanvas: document.getElementById('threeCanvas'),
    NNPath: _settings.NNPath,
    callbackReady: start,
    loadNNOptions: _settings.loadNNOptions,
    nDetectsPerLoop: _settings.nDetectsPerLoop,
    detectOptions: _settings.detectOptions,
    cameraFov: _settings.cameraFov,
    followZRot: _settings.followZRot,
    scanSettings: _settings.scanSettings,
    isFullScreen: true,
    stabilizerOptions: {}
  });
}


// Executed when WebAR.rocks.object is initialized and NN is loaded:
function start(){
  if (_settings.displayDebugCylinder){
    const radius = 0.5;
    const height = radius * 1.5;

    const debugCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 20),
      new THREE.MeshNormalMaterial({wireframe: false, opacity: 0.5})
    );

    WebARRocksObjectThreeHelper.add('CUP', debugCylinder);
  }

  const threeCoffee = CoffeeAnimation.init({
    assetsPath: '../../webxrCoffee/', //where to find coffeeSprite.png
  });
  threeCoffee.scale.multiplyScalar(4);
  threeCoffee.position.set(0.0, 0.2, -0.2);
  WebARRocksObjectThreeHelper.add('CUP', threeCoffee);
  WebARRocksObjectThreeHelper.set_callback('CUP', 'ondetect', function(){
    if (_isFirstDetection){
      document.getElementById('userManual').style.opacity = '0';
      _isFirstDetection = false;
    }
    CoffeeAnimation.start();
  });
  WebARRocksObjectThreeHelper.set_callback('CUP', 'onloose', CoffeeAnimation.reset);
  animate();
}


//main loop (rendering + detecting)
function animate(){
  CoffeeAnimation.update();
  WebARRocksObjectThreeHelper.animate();
  window.requestAnimationFrame(animate);
}


function resize(){
  WebARRocksObjectThreeHelper.resize();
}


window.addEventListener('load', main);
window.addEventListener('resize', resize);

