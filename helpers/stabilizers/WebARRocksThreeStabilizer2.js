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


This stabilizer is suited for using keyboard or QRCode as AR anchor
The neural networks for these use case produce strong instabilities in rotation when the camera moves around
2 algorithms are chained:

* First stabilization algo is output control considering input moves:
  A small move of the input window should not trigger a large sudden move on the 3D object
* Second stabilization algo consists in simulating a damper / spring system, separately
  for translation and rotation. Rotation part is not physical

gen specs:
  - <THREE.Object3D> obj3D: Object to stabilize
  - <int> delay: number of iterations before starting stabilization

specs for first algo:
  - <bool> isStab0Enabled: whether we enable the first stabilization algo
  - [<float>, <float>] dRangePx: ranges in pixels to consider a displacement as a small one
    in the detect state (if below first value) or a large on (if above second value).
  - alphaMin: min value of alpha factor, blend factor for translation and rotation

specs for second algo:
  - <bool> isStab1Enabled: whether we enable the second stabilization algo
  - [<float>, <float>] dtRangeMs: clamp of time step in milliseconds
  - <int> angularStepsCount: number of times the angular stabilization is run
  - <float> angularSpringStrength: angular spring coeff. Should be smaller than 1.0 (otherwise there may have unstabilities)
  - <float> angularDamperStrength: angular damper coeff. Should also be smaller than 1.0
  - <int>posStepsCount: number of times the pos stabilization is run
  - <float> posSpringStrength: spring coeff for pos stabilization
  - <float> posDamperStrength: damper coeff for pos stabilization


 */
const WebARRocksThreeStabilizer = (function(){
  return {
    instance: function(spec){
      const _spec = Object.assign({ // default values:
        // gen specs:
        dtRangeMs: [4, 30],
        delay: 20,

        // first stabilization algo:
        isStab0Enabled: true,
        dRangePx: [1, 6],
        alphaMin: 0.04,

        // second stabilization algo:
        isStab1Enabled: true,
        angleMax: Math.PI/10, // avoid instabilities
        angularStepsCount: 20,
        angularSpringStrength: 1.0,
        angularDamperStrength: 1.0,
        posStepsCount: 10,
        posSpringStrength: 20.0,
        posDamperStrength: 5.0
      }, spec);

      const _prevState = {
        isSet: false,
        x: 0.0,
        y: 0.0,
        w: 0.0,
        h: 0.0,
        t: 0.0
      };

      let _counter = 0;

      // pose0:
      const _stabilizedPosition0 = new THREE.Vector3();
      const _stabilizedQuaternion0 = new THREE.Quaternion();

      // pose1:
      const _stabilizedPosition1 = new THREE.Vector3();
      const _stabilizedQuaternion1 = new THREE.Quaternion();

      const _quaternionIdentity = new THREE.Quaternion();

      const _stab1 = {
        angularStrength: new THREE.Quaternion(),
        angularStrengthSpring: new THREE.Quaternion(),
        angularStrengthDamper: new THREE.Quaternion(),
        angularVelocity: new THREE.Quaternion(),
        angularDVelocity: new THREE.Quaternion(),
        angularD: new THREE.Quaternion(),
        angularDelta: new THREE.Quaternion(),

        posStrength: new THREE.Vector3(),
        posStrengthSpring: new THREE.Vector3(),
        posStrengthDamper: new THREE.Vector3(),
        posVelocity: new THREE.Vector3(),
        posDVelocity: new THREE.Vector3(),
        posD: new THREE.Vector3(),
        posDelta: new THREE.Vector3()
      };

      // preallocate temporary variables:
      const _vec3Tmp = new THREE.Vector3();
      const _axisAngleTmp = {
        axis: new THREE.Vector3(),
        angle: 0
      };
      
      
      function clamp(x, minVal, maxVal){
        return Math.min(Math.max(x, minVal), maxVal);
      }


      function smoothStep(edge0, edge1, x){
        const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
      }


      function compute_alpha(x, y, w, h, NNw){
        const dx = Math.abs(x - _prevState.x);
        const dy = Math.abs(y - _prevState.y);
        const dw = Math.abs(w - _prevState.w);

        // convert to input NN pixels:
        const sw = 0.5 * (w + _prevState.w);
        const sh = 0.5 * (h + _prevState.h);
        const dxPx = dx * NNw / sw;
        const dyPx = dy * NNw / sh;
        const dwPx = dw * NNw / sw;

        const dPx = Math.max(dxPx, dyPx, dwPx);

        const alpha = smoothStep(_spec.dRangePx[0], _spec.dRangePx[1], dPx);
        const alphaPrim = _spec.alphaMin + (1.0 - _spec.alphaMin) * alpha;
        return alphaPrim;
      }


      function apply_pose(quat, pos){
        _spec.obj3D.quaternion.copy(quat);
        _spec.obj3D.position.copy(pos);
      }


      function stabilize1_quat(dt){
        // angular difference pose0 -> pose1:
        _stab1.angularDelta.copy(_stabilizedQuaternion0).invert().premultiply(_stabilizedQuaternion1);
        
        // compute angular strength:
        _stab1.angularStrengthSpring.copy(_stab1.angularDelta);
        scale_quat(_stab1.angularStrengthSpring,  -_spec.angularSpringStrength);
        _stab1.angularStrengthDamper.copy(_stab1.angularVelocity);
        scale_quat(_stab1.angularStrengthDamper, -_spec.angularDamperStrength);
        _stab1.angularStrength.slerpQuaternions(_stab1.angularStrengthSpring, _stab1.angularStrengthDamper, 0.5);
        
        // update cinematics:
        // compute deltas
        _stab1.angularDVelocity.copy(_stab1.angularStrength);
        scale_quat(_stab1.angularDVelocity, dt);
        _stab1.angularD.copy(_stab1.angularVelocity);
        scale_quat(_stab1.angularD, dt);
        
        // apply deltas:
        _stab1.angularVelocity.premultiply(_stab1.angularDVelocity).normalize();
        _stabilizedQuaternion1.premultiply(_stab1.angularD).normalize();
        //_stabilizedQuaternion1.normalize();
      }


      function stabilize1_pos(dt){
        // angular difference pose0 -> pose1:
        _stab1.posDelta.copy(_stabilizedPosition0).sub(_stabilizedPosition1);

        // compute angular strength:
        _stab1.posStrengthSpring.copy(_stab1.posDelta).multiplyScalar(_spec.posSpringStrength);
        _stab1.posStrengthDamper.copy(_stab1.posVelocity).multiplyScalar(-_spec.posDamperStrength);
        _stab1.posStrength.copy(_stab1.posStrengthSpring).add(_stab1.posStrengthDamper);
        
        // update cinematics:
        // compute deltas
        _stab1.posDVelocity.copy(_stab1.posStrength).multiplyScalar(dt);
        _stab1.posD.copy(_stab1.posVelocity).multiplyScalar(dt);

        // apply deltas:
        _stab1.posVelocity.add(_stab1.posDVelocity);
        _stabilizedPosition1.add(_stab1.posD);
      }



      // from https://stackoverflow.com/questions/62457529/how-do-you-get-the-axis-and-angle-representation-of-a-quaternion-in-three-js
      function set_axisAngleFromQuaternion(q, axisAngle) {
        q.normalize(); // make sure q.w <= 1.0
        let angle = 2 * Math.acos(q.w);
        const s = (1.0 - q.w * q.w < 0.000001) ? 1.0 : Math.sqrt(1.0 - q.w * q.w);
        axisAngle.axis.set(q.x/s, q.y/s, q.z/s).normalize();

        if (angle > Math.PI){ // inverse axis:
          axisAngle.axis.multiplyScalar(-1.0);
          angle = 2*Math.PI - angle;
        }
        axisAngle.angle = angle;
      }


      // multiply the angle of the rotation encoded by a quaternion by s
      // It is a pity that this func is not included in THREE Quaternion methods :(
      function scale_quat(quat, s){
        set_axisAngleFromQuaternion(quat, _axisAngleTmp);
        const angle = Math.min(_axisAngleTmp.angle * s, _spec.angleMax);
        quat.setFromAxisAngle(_axisAngleTmp.axis, angle);
      }


      function stabilize0(threePosition, threeQuaternion, detectState){
          // first stabilization: if 2D input does not vary so much
          // do not allow large movements
          const x = detectState.positionScale[0];
          const y = detectState.positionScale[1];
          const w = detectState.positionScale[2];
          const h = detectState.positionScale[3];
          
          if (_prevState.isSet && _counter >= _spec.delay){
            // alpha is stabilization coefficient
            const alpha = compute_alpha(x, y, w, h, detectState.NNInputWidth);
            _stabilizedPosition0.lerp(threePosition, alpha);
            _stabilizedQuaternion0.slerp(threeQuaternion, alpha);
          } else { // first occurence after reset:
            _stabilizedPosition0.copy(threePosition);
            _stabilizedQuaternion0.copy(threeQuaternion);
          }

          _prevState.x = x;
          _prevState.y = y;
          _prevState.w = w;
          _prevState.h = h;
      }


      function stabilize1(){
        // second stabilization: use a damper/spring system between 
        // pose0 and pose1;
        const t = Date.now();
        if (_prevState.isSet && _counter >= _spec.delay){
          let dt = t - _prevState.t;
          dt = clamp(dt, _spec.dtRangeMs[0], _spec.dtRangeMs[1]) / 1000.0; // in seconds
          for (let i=0; i<_spec.angularStepsCount; ++i){
            stabilize1_quat(dt);
          }
          for (let i=0; i<_spec.posStepsCount; ++i){
            stabilize1_pos(dt);
          }
        } else { // first occurence after reset:
          _stab1.angularVelocity.identity();
          _stab1.posVelocity.set(0.0, 0.0, 0.0);
          _stabilizedPosition1.copy(_stabilizedPosition0);
          _stabilizedQuaternion1.copy(_stabilizedQuaternion0);
        }
        _prevState.t = t;
      }


      const that = {
        update: function(threePosition, threeQuaternion, detectState){
          // disable stabilization:
          //apply_pose(threeQuaternion, threePosition); return;

          if (_spec.isStab0Enabled){
            stabilize0(threePosition, threeQuaternion, detectState);
          } else {
            _stabilizedQuaternion0.copy(threeQuaternion);
            _stabilizedPosition0.copy(threePosition);
          }
          
          if (_spec.isStab1Enabled){
            stabilize1();
          } else {
            _stabilizedQuaternion1.copy(_stabilizedQuaternion0);
            _stabilizedPosition1.copy(_stabilizedPosition0);
          }

          if (!_prevState.isSet){
            _prevState.isSet = true;
          }
          ++_counter;
          
          apply_pose(_stabilizedQuaternion1, _stabilizedPosition1);
        },


        reset: function(){
          console.log('Reset stabilization');
          _counter = 0;
          _prevState.isSet = false;
        }
      };
      return that;
    } // end instance()
  } // end class return value
})(); 

// Export ES6 module:
try {
  module.exports = WebARRocksThreeStabilizer;
} catch(e){
  console.log('ES6 Module not exported');
}
