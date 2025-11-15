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
let _DOMVideo = null;
let _threeCanvas = null;
let _isFirstDetection = true;


function is_mobileOrTablet(){
  let check = false;
  // from https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device
  if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
      || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) { 
      check = true;
  }
  return check;
}


// entry point:
function main(){
  THREE.TeapotBufferGeometry = THREE.TeapotGeometry;

  _DOMVideo = document.getElementById('webcamVideo');
  _threeCanvas = document.getElementById('threeCanvas');

  if (!is_mobileOrTablet()){
    mirror_element(_DOMVideo);
    mirror_element(_threeCanvas);
  }

  WebARRocksMediaStreamAPIHelper.get(_DOMVideo, init, function(err){
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


function mirror_element(elt){
  elt.style.transform = 'rotateY(180deg) translate(50%)';
}


// executed when video is OK:
function init(){
  const ARCanvas = document.getElementById('ARCanvas');
  const threeCanvas = document.getElementById('threeCanvas');

  WebARRocksObjectThreeHelper.init({
    video: _DOMVideo,
    ARCanvas: ARCanvas,
    threeCanvas: _threeCanvas,
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

