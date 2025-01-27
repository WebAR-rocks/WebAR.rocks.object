/**
 * WebAR.rocks.object
 *
 * Copyright (c) 2020 WebAR.rocks ( https://webar.rocks )
 * This code is released under dual licensing:
 *   - GPLv3 
 *   - Nominative commercial license
 * Please read https://github.com/WebAR-rocks/WebAR.rocks.object/blob/master/LICENSE
 * 
*//*

Helper for device orientation API

Naming in the same as DeviceOrientationControls THREE.js
https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/DeviceOrientationControls.js

*/

/* eslint-disable */

const DeviceOrientationHelper = (function(){
  const _defaultSpec = {
    THREE: null,
    DOMTrigger: null,
    DOMTriggerOnClick: null,
    DOMRetryTrigger: null,
    isRejectIfMissing: false,
    debug: false
  };
  let _spec = null;
  const _angles = [0.0, 0.0, 0.0, 0.0];

  const _d2r = Math.PI / 180.0;
  
  let _isEnabled = false;
  let _deviceOrientation = null, _screenOrientation = 0.0;
  let _THREE = null, _isThree = false;

  const _threeInstances = {};


  function get_deviceEulerAngle(label){
    const device = _deviceOrientation;
    return (typeof(device[label]) === 'undefined') ? 0 : _d2r * device[label];
  };


  function add_eventListeners(){
    _isEnabled = true;
    window['addEventListener']( 'orientationchange', onScreenOrientationChangeEvent );
    window['addEventListener']( 'deviceorientation', onDeviceOrientationChangeEvent );
  };


  function remove_eventListeners(){
    _isEnabled = false;
    window['removeEventListener']( 'orientationchange', onScreenOrientationChangeEvent );
    window['removeEventListener']( 'deviceorientation', onDeviceOrientationChangeEvent );
  };


  function onDeviceOrientationChangeEvent ( event ) {
    _deviceOrientation = event;
  };


  function onScreenOrientationChangeEvent () {
    _screenOrientation = window['orientation'] || 0;
    _screenOrientation *= _d2r;
  };


  function init_threeInstances(){
    Object.assign(_threeInstances, {
      quat: new _THREE['Quaternion'](),
      q0: new _THREE['Quaternion'](),
      q1: new _THREE['Quaternion'](- Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ), // - PI/2 around the x-axis
      euler: new _THREE['Euler'](),
      zee: new _THREE['Vector3'](0.0, 0.0, 1.0)
    })
  };


  function set_quaternion(quaternion, alpha, beta, gamma, orient ){
    _threeInstances.euler['set']( beta, alpha, - gamma, 'YXZ' ); // 'ZXY' for the device, but 'YXZ' for us
    quaternion['setFromEuler']( _threeInstances.euler ); // orient the device
    quaternion['multiply']( _threeInstances.q1 ); // camera looks out the back of the device, not the top
    quaternion['multiply']( _threeInstances.q0['setFromAxisAngle']( _threeInstances.zee, - orient ) ); // adjust for screen orientation
  };


  function display_alert(msg){
    if (_spec.debugAlerts){
      alert(msg);
    }
  };


  function request_API(retriesCount){
    return new Promise(function(accept, reject){
      // iOS 13+
      if ( window['DeviceOrientationEvent'] !== undefined && typeof window['DeviceOrientationEvent']['requestPermission'] === 'function' ) {
        window['DeviceOrientationEvent']['requestPermission']().then( function ( response ) {
          display_alert('DeviceOrientationEvent response = ' + response);
          if ( response === 'granted' ) {
            add_eventListeners();
            display_alert('DeviceOrientationEvent requestPermission granted');
            accept();
          }
        } ).catch( function ( error ) {
          console.error( 'DeviceOrientationHelper: Unable to use DeviceOrientation API:', error );
          display_alert('DeviceOrientationEvent error = ' + error);
          const errorType = error.toString().split(':').shift().toUpperCase();
          if (errorType==='NOTALLOWEDERROR' && !_spec.DOMTrigger && retriesCount===0){
            const DOMRetryTrigger = _spec.DOMRetryTrigger || window;
            const retry = function(){
              display_alert('DeviceOrientationEvent retry...');
              DOMRetryTrigger.removeEventListener('click', retry);
              request_API(retriesCount+1).then(accept).catch(reject);
            };
            DOMRetryTrigger.addEventListener('click', retry);
            return;
          }
          reject();
        } );
      } else if(_spec.isRejectIfMissing){
        display_alert('DeviceOrientationEvent missing');
        reject();
      } else {
        add_eventListeners();
        display_alert('DeviceOrientationEvent available without requestPermission');
        accept();
      }
    }); //end returned promise
  }


  return {
    init: function (spec) {
      _spec = Object.assign({}, _defaultSpec, spec);
      _THREE = _spec.THREE;
      _isThree = (_THREE !== null);
      if (_isThree){
        init_threeInstances();
      }

      onScreenOrientationChangeEvent(); // run once on load
      
      if (_spec.DOMTrigger){
        return new Promise(function(accept, reject){
          _spec.DOMTrigger.addEventListener('click', function(){
            if (_spec.DOMTriggerOnClick){
              _spec.DOMTriggerOnClick();
            }
            request_API(0).then(accept).catch(reject);
          });
        });
      } else {
        return request_API(0);
      }
    },


    compute_rotationX: function(quat){
      if (!_isThree){
        throw new Error('Please provide THREE');
      }
      _threeInstances.euler['setFromQuaternion'](quat, 'YXZ');
      return _threeInstances.euler['x'];
    },


    compute_rotationY: function(quat){
      if (!_isThree){
        throw new Error('Please provide THREE');
      }
      _threeInstances.euler['setFromQuaternion'](quat, 'YXZ');
      return _threeInstances.euler['y'];
    },


    compute_rotationZ: function(quat){
      if (!_isThree){
        throw new Error('Please provide THREE');
      }
      _threeInstances.euler['setFromQuaternion'](quat, 'YXZ');
      return _threeInstances.euler['z'];
    },


    update: function(){
      if (!_isEnabled || !_deviceOrientation){
        return null;
      }

      const alpha = get_deviceEulerAngle('alpha'); // rotZ
      const beta = get_deviceEulerAngle('beta'); // rotX
      const gamma = get_deviceEulerAngle('gamma'); // rotY

      if (_isThree){
        set_quaternion( _threeInstances.quat, alpha, beta, gamma, _screenOrientation );
        return _threeInstances.quat;
      } else {
        _angles[0] = alpha, _angles[1] = beta, _angles[2] = gamma, _angles[3] = _screenOrientation;
        return _angles;
      }
    },


    destroy: function () {
      remove_eventListeners();
    }
  }
})(); 

export default DeviceOrientationHelper;
