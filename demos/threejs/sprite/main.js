const _settings = {
  nDetectsPerLoop: 0, // 0 -> adaptative

  loadNNOptions: {
    notHereFactor: 0.0,
    paramsPerLabel: {
      SPRITECAN: {
        thresholdDetect: 0.6
      }
    }
  },

  detectOptions: {
    isKeepTracking: true,
    isSkipConfirmation: false,
    thresholdDetectFactor: 1,
    cutShader: 'median',
    nConfirmUnstitchMoves: 50,
    thresholdDetectFactorUnstitch: 0.15,
    trackingFactors: [0.3, 0.2, 1]
  },

  NNPath: '../../../neuralNets/NN_SPRITE_1.json',
  
  cameraFov: 0, // WebARRocksMediaStreamAPIHelper.evaluate_verticalFoV(),         //vertical field of View of the 3D camera in degrees. set 75 for mobile, 55 for desktop
  scanSettings:{   
  },

  followZRot: true
};

// some globals:
let _DOMVideo = null;


// entry point:
function main(){
  _DOMVideo = document.getElementById('webcamVideo');
  WebARRocksMediaStreamAPIHelper.get(_DOMVideo, init, function(err){
    throw new Error('Cannot get video feed ' + err);
  }, {
    video: {
      width:  {min: 640, max: 1920, ideal: 1280},
      height: {min: 640, max: 1920, ideal: 720},
      facingMode: {ideal: 'environment'}
    },
    audio: false
 });
}


// executed when video is OK:
function init(){
  const ARCanvas = document.getElementById('ARCanvas');
  const threeCanvas = document.getElementById('threeCanvas');

  WebARRocksObjectThreeHelper.init({
    video: _DOMVideo,
    ARCanvas: ARCanvas,
    threeCanvas: threeCanvas,
    NNPath: _settings.NNPath,
    isFullScreen: true,
    callbackReady: function(){
      start();

      // fix a weird bug noticed on Chrome 98:
      threeCanvas.style.position = 'fixed';
      ARCanvas.style.position = 'fixed';
    },
    loadNNOptions: _settings.loadNNOptions,
    nDetectsPerLoop: _settings.nDetectsPerLoop,
    detectOptions: _settings.detectOptions,
    cameraFov: _settings.cameraFov,
    followZRot: _settings.followZRot,
    scanSettings: _settings.scanSettings,
    stabilizerOptions: {n: 3}
  });
}


// Executed when WebAR.rocks.object is initialized and NN is loaded:
function start(){
  const radius = 0.31;
  const height = radius * 3.5;

  const debugCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 20),
    new THREE.MeshNormalMaterial({wireframe: false})
  );

  WebARRocksObjectThreeHelper.add('SPRITECAN', debugCylinder);
  animate();
}


// main loop (rendering + detecting):
function animate(){
  WebARRocksObjectThreeHelper.animate();
  window.requestAnimationFrame(animate);
}


window.addEventListener('load', main);
