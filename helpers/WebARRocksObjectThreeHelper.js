/**
 * Copyright 2020 WebAR.rocks ( https://webar.rocks )
 * 
 * WARNING: YOU SHOULD NOT MODIFY THIS FILE OTHERWISE WEBAR.ROCKS
 * WON'T BE RESPONSIBLE TO MAINTAIN AND KEEP YOUR ADDED FEATURES
 * WEBAR.ROCKS WON'T BE LIABLE FOR BREAKS IN YOUR ADDED FUNCTIONNALITIES
 *
 * WEBAR.ROCKS KEEP THE RIGHT TO WORK ON AN UNMODIFIED VERSION OF THIS SCRIPT.
 * 
 * THIS FILE IS A HELPER AND SHOULD NOT BE MODIFIED TO IMPLEMENT A SPECIFIC USER SCENARIO
 * OR TO ADDRESS A SPECIFIC USE CASE.
 */

/*
 spec properties:
  - <HTMLCanvasElement> ARCanvas
  - <HTMLCanvasElement> threeCanvas
  - <HTMLVideoElement> video
  - <function> callbackReady
  - <string> NNPath
  - <dict> loadNNOptions- 
  - <dict> detectOptions
  - <number> nDetectsPerLoop
  - <float> cameraFov. 0 for auto estimation
  - <boolean> followZRot
  - <dict> scanSettings
  - <object> stabilizerOptions
  - <boolean> isFullScreen
  - <float> zOffset - 0.5 by default, relative
 */


const WebARRocksObjectThreeHelper = (function(){
  
  const _defaultSpec = {
    video: null,
    canvas: null,
   
    // pose computation: 
    zOffset: 0.5,
    followZRot: false,
    isUseDeviceOrientation: false,
    deviceOrientationDOMTrigger: null,
    deviceOrientationDOMTriggerOnClick: null,
    deviceOrientationKeepRotYOnly: false,
    deviceOrientationEnableDelay: 30, // number of iterations before enabling the feature
    
    // detection and tracking:
    nDetectsPerLoop: 0,
    detectOptions: null,
    scanSettings: null,

    // stabilization:
    isStabilized: false,
    stabilizerOptions: null,

    // display:
    isFullScreen: false,
    cameraFov: 0, // auto FoV computation
    cameraMinVideoDimFov: 35, // FoV along the minimum video dimension (height or width), in degrees. used only if auto FoV
    cameraZNear: 0.1,
    cameraZFar: 500
  };

  const _three = {
    renderer: null,
    containers: {},
    camera: null,
    scene: null,
    euler: null,
    quaternion: null,
    position: null
  };

  const _stabilizers = {};

  const _videoRes = {
    width: -1,
    height: -1
  };

  const _deg2rad = Math.PI / 180;
  const _deviceOrientation = {
    isEnabled: false,
    quatCamToWorld: null,
    quatObjToWorld: null,
    counter: 0
  };

  let _spec = null;
  const _callbacks = {};


  function init_deviceOrientation(){
    if (!_spec.isUseDeviceOrientation){
      return Promise.reject();
    }
    if (typeof(DeviceOrientationHelper) === 'undefined'){
      throw new Error('Please include DeviceOrientationHelper.js to use isUseDeviceOrientation option');
    }
    return DeviceOrientationHelper.init({
      THREE: THREE,
      DOMTrigger: _spec.deviceOrientationDOMTrigger,
      DOMTriggerOnClick: _spec.deviceOrientationDOMTriggerOnClick,
      isRejectIfMissing: true,
      DOMRetryTrigger: _three.renderer.domElement,
      debugAlerts: false
    });
  }

  
  function update_orientationFromDeviceOrientation(quatObjToCam, quatTarget){
    ++ _deviceOrientation.counter;

    if ( _deviceOrientation.counter < _spec.deviceOrientationEnableDelay){
      // first detections, we consider the results of the neural network
      // is not reliable enough to compute quatObjToWorld
      return;
    }

    const quatWorldToCam = DeviceOrientationHelper.update();
    _deviceOrientation.quatCamToWorld.copy(quatWorldToCam).invert();
      
    // compute _deviceOrientation.quatObjToWorld:
    if ( _deviceOrientation.counter === _spec.deviceOrientationEnableDelay ){
      _deviceOrientation.quatObjToWorld.copy(quatObjToCam).premultiply(quatWorldToCam);
      if (_spec.deviceOrientationKeepRotYOnly){
        const eulerOrder = 'YXZ';
        const eulerObjToWorld = new THREE.Euler().setFromQuaternion(_deviceOrientation.quatObjToWorld, eulerOrder);
        eulerObjToWorld.set(0.0, eulerObjToWorld.y, 0.0, eulerOrder);
        _deviceOrientation.quatObjToWorld.setFromEuler(eulerObjToWorld);
      }
    }

    quatTarget.copy(_deviceOrientation.quatObjToWorld).premultiply(_deviceOrientation.quatCamToWorld);

    // DEBUG ZONE:
    //quatTarget.identity(); // in keyboard demo, display cube always facing camera
    //quatTarget.copy(quatWorldToCam); // in keyboard demo, rot movement seems inverted
    //quatTarget.copy(_deviceOrientation.quatCamToWorld); // in keyboard demo, rot movement good but rot offset
  }


  const that = {
    init: function(spec){
      // Extract parameters:
      _spec = Object.assign({}, _defaultSpec, spec, {
        isStabilized: (spec.stabilizerOptions !== undefined && typeof(WebARRocksThreeStabilizer) !== 'undefined' ) ? true : false
      });

      // Initialize WebAR.rocks.object:
      WEBARROCKSOBJECT.init({
        video: _spec.video,
        canvas: _spec.ARCanvas,
        followZRot: _spec.followZRot,
        scanSettings: _spec.scanSettings
      });

      // Initialize THREE.js instances:
      _three.renderer = new THREE.WebGLRenderer({
        canvas: _spec.threeCanvas,
        alpha: true
      });

      _three.scene = new THREE.Scene();
      _three.camera = new THREE.PerspectiveCamera( _spec.cameraFov, _spec.threeCanvas.width / _spec.threeCanvas.height, _spec.cameraZNear, _spec.cameraZFar );
      _three.euler = new THREE.Euler(0, 0, 0, 'ZXY');
      _three.position = new THREE.Vector3();
      _three.quaternion = new THREE.Quaternion();

      // Set neural network model:
      WEBARROCKSOBJECT.set_NN(_spec.NNPath, function(err){
        if (!err){
          that.resize();
          init_deviceOrientation().then(function(){
            _deviceOrientation.isEnabled = true;
            _deviceOrientation.quatCamToWorld = new THREE.Quaternion();
            _deviceOrientation.quatObjToWorld = new THREE.Quaternion();
          }).catch(function(err){
            console.log('Device Orientation API is not used');
          });
        }
        if (_spec.callbackReady){
          _spec.callbackReady(err, _three);
        }
      }, _spec.loadNNOptions);
    },


    resize: function(){
      const canvas = _three.renderer.domElement;
      if (_spec.isFullScreen){
        const dpr = window.devicePixelRatio || 1;
        const fsw = window.innerWidth;
        // do not use window.innerHeight because it excludes the URL bar
        // on IOS:
        const fsh = screen.availHeight;
        canvas.width = fsw * dpr;
        canvas.height = fsh * dpr;
        canvas.style.width = fsw.toString() + 'px';
        canvas.style.height = fsh.toString() + 'px';
      } 
      that.update_threeCamera();      
    },


    animate: function(){
      const detectState = WEBARROCKSOBJECT.detect(_spec.nDetectsPerLoop, null, _spec.detectOptions);
      
      for(let label in _three.containers){
        const threeContainer = _three.containers[label];

        if (!detectState.label || detectState.label!==label){
          if (threeContainer.visible){
            that.trigger_callback(label, 'onloose');
          }
          threeContainer.visible = false;
          _deviceOrientation.counter = 0;
          continue;
        }
        
        if (!threeContainer.visible && _spec.isStabilized){
          _stabilizers[label].reset();
        }

        if (!threeContainer.visible){
          that.trigger_callback(label, 'ondetect');
        }
        threeContainer.visible = true;

        // compute position:
        const halfTanFOV = Math.tan(_three.camera.aspect * _three.camera.fov * _deg2rad / 2); 

        // // scale in the viewport of the camera:
        const s = detectState.positionScale[2];

        // move the cube in order to fit the head
        const W = s;                        // relative width of the detection window (1-> whole width of the detection window)
        const D = 1 / (2 * W * halfTanFOV); // distance between the front face of the cube and the camera
        
        // coords in 2D of the center of the detection window in the viewport of the camera:
        const xv = (2 * detectState.positionScale[0] - 1);
        const yv = (2 * detectState.positionScale[1] - 1);
        
        // coords in 3D of the center of the cube (in the view coordinates system)
        const z = -D - _spec.zOffset;   // minus because view coordinate system Z goes backward. -0.5 because z is the coord of the center of the cube (not the front face)
        const x = xv * D * halfTanFOV;
        const y = yv * D * halfTanFOV / _three.camera.aspect;
        _three.position.set(x, y, z);

        // compute rotation:
        const dPitch = detectState.pitch - Math.PI / 2; // look up/down rotation (around X axis)
        _three.euler.set( -dPitch, detectState.yaw + Math.PI, -detectState.roll);
        _three.quaternion.setFromEuler(_three.euler);

        // apply position and rotation:
        if (_spec.isStabilized){
          _stabilizers[label].update(_three.position, _three.quaternion, detectState, _videoRes);
        } else { // no stabilization, directly assign position and orientation:
          threeContainer.position.copy(_three.position);
          threeContainer.quaternion.copy(_three.quaternion);
        }

        if (_deviceOrientation.isEnabled){
          update_orientationFromDeviceOrientation(threeContainer.quaternion, threeContainer.quaternion);
        }
      } //end for

      _three.renderer.render(_three.scene, _three.camera);
    },


    add: function(label, threeStuff){
      // build the threeContainer, which will track the detected object:
      const isNew = (_three.containers[label]) ? false : true;
      const threeContainer = (isNew) ? new THREE.Object3D() : _three.containers[label];
      _three.containers[label] = threeContainer;
      threeContainer.add(threeStuff);

      if (isNew) {
        _three.scene.add(threeContainer);
        
        // initialize stabilizer if required:
        if (_spec.isStabilized){
          _stabilizers[label] = WebARRocksThreeStabilizer.instance(Object.assign({
            obj3D: threeContainer
          }, _spec.stabilizerOptions));
        }
      }
    },


    set_callback: function(label, callbackType, callbackFunc){
      if (!_callbacks[label]){
        _callbacks[label] = {
          ondetect: null,
          onloose: null
        }
      }
      _callbacks[label][callbackType] = callbackFunc;
    },


    trigger_callback: function(label, callbackType, args){
      if (!_callbacks[label] || !_callbacks[label][callbackType]){
        return;
      }
      _callbacks[label][callbackType](args);
    },


    get_occluderMaterial: function(){ // return depth occlusion material:
      return new THREE.ShaderMaterial({
        vertexShader: THREE.ShaderLib.basic.vertexShader,
        fragmentShader: "precision lowp float;\n void main(void){\n gl_FragColor = vec4(1.,0.,0.,1.);\n }",
        uniforms: THREE.ShaderLib.basic.uniforms,
        side: THREE.DoubleSide,
        colorWrite: false
      });
    },


    update_threeCamera: function(){
      // compute aspectRatio:
      const canvasElement = _three.renderer.domElement;
      const cvw = canvasElement.width;
      const cvh = canvasElement.height;
      const canvasAspectRatio = cvw / cvh;

      // compute vertical field of view:
      const vw = _spec.video.videoWidth;
      const vh = _spec.video.videoHeight;
      _videoRes.width = vw;
      _videoRes.height = vh;
      const videoAspectRatio = vw / vh;
      let fov = -1;
      if (_spec.cameraFov === 0){ // auto fov
        const fovFactor = (vh > vw) ? (1.0 / videoAspectRatio) : 1.0;
        fov = _spec.cameraMinVideoDimFov * fovFactor;        
      } else {
        fov = _spec.cameraFov;
      }

      // if fov is too large (over 90°), weird errors happens
      fov = Math.min(fov, 60);
      
      // compute X and Y offsets in pixels:
      let scale = 1.0;
      if (canvasAspectRatio > videoAspectRatio) {
        // the canvas is more in landscape format than the video, so we crop top and bottom margins:
        scale = cvw / vw;
      } else {
        // the canvas is more in portrait format than the video, so we crop right and left margins:
        scale = cvh / vh;
      }
      
      const cvws = vw * scale, cvhs = vh * scale;
      const offsetX = (cvws - cvw) / 2.0;
      const offsetY = (cvhs - cvh) / 2.0;
      
      /*if (canvasAspectRatio > videoAspectRatio) {
        // we also need to reduce the vertical fov because we crop top and bottom margins:
        const halfFovRad = _deg2rad * fov / 2;
        fov = 2 * Math.atan((cvh / cvhs) * Math.tan(halfFovRad)) / _deg2rad;
      }*/

      // reset camera:
      _three.camera.clearViewOffset();
      _three.camera.view = null; // fix a crappy THREE.js bug

      // reinit camera:
      _three.camera.aspect = videoAspectRatio;
      _three.camera.fov = fov;
      console.log('INFO in WebARRocksObjectThreeHelper.update_threeCamera(): camera vertical estimated FoV is', fov);

      _three.camera.setViewOffset(cvws, cvhs, offsetX, offsetY, cvw, cvh);
      _three.camera.updateProjectionMatrix();

      // update drawing area:
      _three.renderer.setSize(cvw, cvh, false);
      _three.renderer.setViewport(0, 0, cvw, cvh);
    }

  }; //end that
  return that;
})();

// Export ES6 module:
try {
  module.exports = WebARRocksObjectThreeHelper;
} catch(e){
  console.log('ES6 Module not exported');
}