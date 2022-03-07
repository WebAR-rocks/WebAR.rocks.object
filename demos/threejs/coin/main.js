const _settings = {
  nDetectsPerLoop: 0, // 0 -> adaptative

  loadNNOptions: {
    notHereFactor: 0.0,
    paramsPerLabel: {
      USQUARTER: {
        thresholdDetect: 0.6
      }
    }
  },

  detectOptions: {
    isKeepTracking: true,
    isSkipConfirmation: false,
    thresholdDetectFactor: 1,
    cutShader: 'median',
    thresholdDetectFactorUnstitch: 0.1,
    trackingFactors: [0.5, 0.5, 0.5]
  },

  NNPath: '../../../../privateNeuralNets/NN_USQUARTER_10.json', //BEST
  //NNPath: '../../../../../../../neuralNets/raw/objectTrackingCoins/ARCoinUSQuarter0_2020-08-26_2_0.json',
  
  cameraFov: WebARRocksMediaStreamAPIHelper.evaluate_verticalFoV(),  // vertical field of View of the 3D camera in degrees. set 75 for mobile, 55 for desktop
  scanSettings:{ 
    nScaleLevels: 3,
    overlapFactors: [5, 5, 4],
    scale0Factor: 0.5
  },

  followZRot: false
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


// executed when video is ready:
function init(){
  const ARCanvas = document.getElementById('ARCanvas');
  const threeCanvas = document.getElementById('threeCanvas');
  //alert('Video resolution: ' + _DOMVideo.videoWidth.toString() + 'x' + _DOMVideo.videoHeight.toString());

  WebARRocksObjectThreeHelper.init({
    video: _DOMVideo,
    ARCanvas: ARCanvas,    
    threeCanvas: threeCanvas,
    isFullScreen: true,
    NNPath: _settings.NNPath,
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
  const debugCube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshNormalMaterial({wireframe: false})
  );
  debugCube.position.set(0, 0.5, 0);
  
  WebARRocksObjectThreeHelper.add('USQUARTER', debugCube);
  animate();
}


// main loop (rendering + detecting):
function animate(){
  WebARRocksObjectThreeHelper.animate();
  window.requestAnimationFrame(animate);
}


window.addEventListener('load', main);
