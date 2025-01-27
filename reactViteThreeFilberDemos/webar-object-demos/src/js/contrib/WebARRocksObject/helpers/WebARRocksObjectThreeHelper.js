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


/* eslint-disable */

import {
  Euler,
  Matrix4,
  Quaternion,
  Vector3
} from 'three';

import WebARRocksThreeStabilizer from './WebARRocksThreeStabilizer.js';

import DeviceOrientationHelper from './DeviceOrientationHelper.js';

// import main script:
import WEBARROCKSOBJECT from '../dist/WebARRocksObject.module.js';

/*
 spec properties:
  - <HTMLCanvasElement> ARCanvas
  - <HTMLVideoElement> video
  - <function> callbackReady
  - <object> NN
  - <dict> loadNNOptions- 
  - <dict> detectOptions
  - <number> nDetectsPerLoop
  - <float> cameraFov. 0 for auto estimation
  - <boolean> followZRot
  - <dict> scanSettings
  - <object> stabilizerOptions
  - <float> zOffset - 0.5 by default, relative
 */

const WebARRocksObjectThreeHelper = (function(){
  const _three = {
    containers: {},
    euler: null,
    quaternion: null,
    position: null
  };

  let _stabilizers = {};

  const _previousSizing = {
    width: 1,
    height: -1
  };
  let _threeProjMatrix = null;
  
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
    cameraFov: 0, // auto-evaluated
    cameraMinVideoDimFov: 35, // FoV along the minimum video dimension (height or width), in degrees
    cameraZNear: 0.1,
    cameraZFar: 5000
  };

  const _deg2rad = Math.PI / 180;
  const _deviceOrientation = {
    isEnabled: false,
    quatCamToWorld: null,
    quatObjToWorld: null,
    counter: 0
  };

  let _spec = null;
  let _callbacks = {};


  function update_stabilizers(){
    if (_spec === null || !_spec.isStabilized) {
      return;
    }
    for (let label in _three.containers){
      if (_stabilizers[label]) {
        continue;
      }
      _stabilizers[label] = WebARRocksThreeStabilizer.instance(Object.assign({
        obj3D: _three.containers[label]
      }, _spec.stabilizerOptions));
    }
  }


  function init_deviceOrientation(){
    if (!_spec.isUseDeviceOrientation){
      return Promise.reject();
    }
    if (typeof(DeviceOrientationHelper) === 'undefined'){
      throw new Error('Please include DeviceOrientationHelper.js to use isUseDeviceOrientation option');
    }
    return DeviceOrientationHelper.init({
      THREE: {
        'Euler': Euler,
        'Quaternion': Quaternion,
        'Vector3': Vector3
      },
      DOMTrigger: _spec.deviceOrientationDOMTrigger,
      DOMTriggerOnClick: _spec.deviceOrientationDOMTriggerOnClick,
      isRejectIfMissing: true,
      DOMRetryTrigger: null,//_three.renderer.domElement,
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
        const eulerObjToWorld = new Euler().setFromQuaternion(_deviceOrientation.quatObjToWorld, eulerOrder);
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
        isStabilized: (spec.stabilizerOptions !== undefined && WebARRocksThreeStabilizer) ? true : false
      });

      Object.assign(_previousSizing, {
        width: -1, height: -1
      });

      // Initialize WebAR.rocks.object:
      WEBARROCKSOBJECT.init({
        video: _spec.video,
        canvas: _spec.ARCanvas,
        followZRot: _spec.followZRot,
        scanSettings: _spec.scanSettings
      });

      _three.euler = new Euler(0, 0, 0, 'ZXY');
      _three.position = new Vector3();
      _three.quaternion = new Quaternion();
      _threeProjMatrix = new Matrix4();

      // Set neural network model:
      WEBARROCKSOBJECT.set_NN(_spec.NN, function(err){
        if (!err){
          update_stabilizers();
          init_deviceOrientation().then(function(){
            _deviceOrientation.isEnabled = true;
            _deviceOrientation.quatCamToWorld = new Quaternion();
            _deviceOrientation.quatObjToWorld = new Quaternion();
          }).catch(function(err){
            console.log('Device Orientation API is not used');
          });
        }
        if (_spec.callbackReady){
          _spec.callbackReady(err);
        }
      }, _spec.loadNNOptions);
    },


    update_poses: function(threeCamera){
      if (_spec === null || !_spec.video){
        return;
      }

      const detectState = WEBARROCKSOBJECT.detect(_spec.nDetectsPerLoop, null, _spec.detectOptions);
      
      for(let label in _three.containers){
        that.trigger_callback(label, 'onprocess', detectState);

        const threeContainer = _three.containers[label];

        if (!detectState.label || detectState.label!==label){
          if (threeContainer.visible){
            that.trigger_callback(label, 'onloose', detectState);
          }
          threeContainer.visible = false;
          _deviceOrientation.counter = 0;
          continue;
        }
        
        if (!threeContainer.visible && _spec.isStabilized){
          _stabilizers[label].reset();
        }

        if (!threeContainer.visible){
          that.trigger_callback(label, 'ondetect', detectState);
        }
        threeContainer.visible = true;
        
        // compute position:
        const halfTanFOV = Math.tan(threeCamera.aspect * threeCamera.fov * _deg2rad / 2); 

        // scale in the viewport of the camera:
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
        const y = yv * D * halfTanFOV / threeCamera.aspect;
        _three.position.set(x, y, z);

        // compute rotation:
        const dPitch = detectState.pitch - Math.PI / 2; //look up/down rotation (around X axis)
        _three.euler.set( -dPitch, detectState.yaw + Math.PI, -detectState.roll);
        _three.quaternion.setFromEuler(_three.euler);

        // apply position and rotation:
        if (_spec.isStabilized){
          _stabilizers[label].update(_three.position, _three.quaternion);
        } else { // no stabilization, directly assign position and orientation:
          threeContainer.position.copy(_three.position);
          threeContainer.quaternion.copy(_three.quaternion);
        }

        if (_deviceOrientation.isEnabled){
          update_orientationFromDeviceOrientation(threeContainer.quaternion, threeContainer.quaternion);
        }
      } //end for
    },


    set_objectFollower: function(label, threeContainer){
      _three.containers[label] = threeContainer;      
      update_stabilizers();
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


    update_threeCamera: function(sizing, threeCamera){
      if (_spec === null || !_spec.video) return;
      
      // reset camera position:
      if (threeCamera.matrixAutoUpdate){
        threeCamera.far = _spec.cameraZFar;
        threeCamera.near = _spec.cameraZNear;
        threeCamera.matrixAutoUpdate = false;
        threeCamera.position.set(0, 0, 0);
        threeCamera.updateMatrix();
      }     

      // compute aspectRatio:
      const cvw = sizing.width;
      const cvh = sizing.height;
      const canvasAspectRatio = cvw / cvh;

      // compute vertical field of view:
      const vw = _spec.video.videoWidth;
      const vh = _spec.video.videoHeight;
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

      if (_previousSizing.width === sizing.width && _previousSizing.height === sizing.height
        && threeCamera.fov === fov
        && threeCamera.view.offsetX === offsetX && threeCamera.view.offsetY === offsetY
        && threeCamera.projectionMatrix.equals(_threeProjMatrix) ){
       
        return; // nothing changed
      }
      Object.assign(_previousSizing, sizing);
            
      // reset camera:
      threeCamera.clearViewOffset();
      threeCamera.view = null; // fix a crappy THREE.js bug

      // reinit camera:
      threeCamera.aspect = videoAspectRatio;
      threeCamera.fov = fov;
      console.log('INFO in WebARRocksObjectThreeHelper.update_threeCamera(): camera vertical estimated FoV is', fov);
      threeCamera.setViewOffset(cvws, cvhs, offsetX, offsetY, cvw, cvh);
      threeCamera.updateProjectionMatrix();

      _threeProjMatrix.copy(threeCamera.projectionMatrix);
    },


    destroy: function(){
      _callbacks = {};
      _stabilizers = {};
      _three.containers = {};
      _spec = null;
      return WEBARROCKSOBJECT.destroy();
    }


  }; //end that
  return that;
})();

export default WebARRocksObjectThreeHelper;