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
  Quaternion,
  Vector3
} from 'three';

/*
spec:
  - <THREE.Object3D> obj3D: Object to stabilize
  - <integer> n: the size of the sliding window to compute floating average is 2^n. default: 3
  - <float> sigmaPosThreshold: a large move is detected if posDiff > sigmaPosThreshold * sigmaPos . Default: 6
  - <float> sigmaAngleThreshold: a large move is detected if angleDiff > sigmaAngleThreshold * sigmaAngle . Default: 2
  - <float> pow: stabilization coefficient pow. default: 2

 */
const WebARRocksThreeStabilizer = (function(){
  function compute_positionsMean(positions, result){
    result.set(0, 0, 0);
    positions.forEach(function(pos){
      result.add(pos);
    });
    result.divideScalar(positions.length);
  }


  function compute_velocityPositionMean(cursor, positions, dts, result){
    const n = positions.length;
    result.set(0, 0, 0);
    const dv = new Vector3();
    for (let i=0; i<n-1; ++i){
      const c = (n + cursor - i) % n;
      const cPrev = (c === 0) ? n-1 : c-1;
      const dt = dts[c];
      const pos = positions[c];
      const posPrev = positions[cPrev];
      dv.copy(pos).sub(posPrev).divideScalar(dt);
      result.add(dv);
    }
    result.divideScalar(n-1);
  }


  function compute_velocityAngleMean(cursor, quaternions, dts){
    let r = 0;
    const n = quaternions.length;
    for (let i=0; i<n-1; ++i){
      const c = (n + cursor - i) % n;
      const cPrev = (c === 0) ? n-1 : c-1;
      const dt = dts[c];
      const quat = quaternions[c];
      const quatPrev = quaternions[cPrev];
      const dAngle = quatPrev.angleTo(quat);
      const dv = dAngle / dt;
      r += dv;
    }
    r /= (n-1);
    return r;
  }


  function compute_positionsSigma(positions, mean, result){
    result.set(0, 0, 0);
    const diff = new Vector3();
    positions.forEach(function(pos){
      diff.copy(pos).sub(mean);
      diff.set(diff.x*diff.x, diff.y*diff.y, diff.z*diff.z);
      result.add(diff);
    });
    result.divideScalar(positions.length);
    result.set(Math.sqrt(result.x), Math.sqrt(result.y), Math.sqrt(result.z));
  }


  function compute_quaternionsSigma(quaternions, mean){
    let angle = 0;
    quaternions.forEach(function(quat){
      const dAngle = quat.angleTo(mean);
      angle += dAngle * dAngle;
    });
    return Math.sqrt(angle / quaternions.length);
  }


  return {
    instance: function(spec){
      let _counter = 0;
      let _curs = 0;
      const _spec = Object.assign({ // default values:
        n: 3,
        sigmaPosThreshold: 6,
        sigmaAngleThreshold: 4,
        pow: 2
      }, spec);
      const _N = Math.pow(2, _spec.n);

      // we will do the mean between 2^_N values
      const _quaternionSlerps = [];
      allocate_quaternionsMeansIntermediary();

      // recorded last values:
      const _lastQuaternions = [];
      const _lastPositions = [];
      const _lastDts = [];
      const _lastTimestamps = [];
      for (let i=0; i<_N; ++i){
        _lastPositions.push(new Vector3());
        _lastQuaternions.push(new Quaternion());
        _lastDts.push(0);
        _lastTimestamps.push(0);
      }
      let _sumDt = 0;

      // mean pose:
      const _positionMean = new Vector3();
      const _quaternionMean = new Quaternion();

      // mean velocity:
      const _velocityPositionMean = new Vector3();
      let _velocityAngleMean = 0;

      const _positionSigma = new Vector3();

      // difference between mean and current:
      const _diffPosition = new Vector3();
      const _diffQuaternion = new Quaternion();
      
      // stabilized pose:
      const _positionStabilized = new Vector3();
      const _quaternionStabilized = new Quaternion();


      // private dynamic functions:
      function stabilize_diffComponent(diffVal, sigma, sigmaThreshold, velocityMean, sumDt, componentLabel){
        //return diffVal;

        const diffValAbs = Math.abs(diffVal);
        const thres = sigmaThreshold * sigma;
        let k = 1;

        if (diffValAbs < thres){
          k = Math.pow(diffValAbs / thres, _spec.pow);          
        }
        
        const meanDiffVal = velocityMean * sumDt / 2;

        return diffVal * k + meanDiffVal * (1-k);
      }


      function save_positionQuaternion(threePosition, threeQuaternion){
        const t = performance.now() / 1000; // in seconds
        const cursPrev = (_curs === 0) ? _N-1 : _curs - 1;
        const dt = (_counter === 0) ? 0 : t - _lastTimestamps[cursPrev];
        _lastDts[_curs] = dt;
        _lastTimestamps[_curs] = t;

        // compute time interval:
        const cursFirst = (_curs + 1) % _N;
        _sumDt = t - _lastTimestamps[cursFirst];

        // save pose:
        _lastPositions[_curs].copy(threePosition);
        _lastQuaternions[_curs].copy(threeQuaternion);
      }


      function increment_cursor(){
        _curs = (_curs + 1) % _N;
      }


      function apply_positionQuaternion(threePosition, threeQuaternion){
        _spec.obj3D.quaternion.copy(threeQuaternion);
        _spec.obj3D.position.copy(threePosition);
      }


      function allocate_quaternionsMeansIntermediary(){
        for (let i=_spec.n-1; i>=0; --i){
          const quatSlerps = [];
          const l = Math.pow(2, i);
          for (let j=0; j<l; ++j) {
            quatSlerps.push(new Quaternion());
          }
          _quaternionSlerps.push(quatSlerps);
        }
      }


      function compute_quaternionsMean(quaternions, result){
        _quaternionSlerps.forEach(function(quaternionSlerpLevel, level){
          const previousLevelQuats = (level === 0) ? quaternions : _quaternionSlerps[level - 1];
          quaternionSlerpLevel.forEach(function(quat, i){
            quat.slerpQuaternions(previousLevelQuats[2*i], previousLevelQuats[2*i + 1], 0.5);
            if (level === _spec.n - 1){
              result.copy(quat);
            }
          });
        });
      }

      const that = {
        update: function(threePosition, threeQuaternion){
          save_positionQuaternion(threePosition, threeQuaternion);

          if (++_counter < _N){
            increment_cursor();
            apply_positionQuaternion(threePosition, threeQuaternion)
            return;
          }

          // compute mean of orientation and position:
          compute_positionsMean(_lastPositions, _positionMean);
          compute_quaternionsMean(_lastQuaternions, _quaternionMean);

          // compute velocities:
          compute_velocityPositionMean(_curs, _lastPositions, _lastDts, _velocityPositionMean);
          _velocityAngleMean = compute_velocityAngleMean(_curs, _lastQuaternions, _lastDts);

          // compute sigmas, represented by an angle and a Vector3:
          compute_positionsSigma(_lastPositions, _positionMean, _positionSigma);
          const angleSigma = compute_quaternionsSigma(_lastQuaternions, _quaternionMean);

          // difference between mean position and current position:
          _diffPosition.copy(threePosition).sub(_positionMean);
          _diffPosition.set(
            stabilize_diffComponent(_diffPosition.x, _positionSigma.x, _spec.sigmaPosThreshold, _velocityPositionMean.x, _sumDt, 'x'),
            stabilize_diffComponent(_diffPosition.y, _positionSigma.y, _spec.sigmaPosThreshold, _velocityPositionMean.y, _sumDt, 'y'),
            stabilize_diffComponent(_diffPosition.z, _positionSigma.z, _spec.sigmaPosThreshold, _velocityPositionMean.z, _sumDt, 'z')
          );
          // compute stabilized position:
          _positionStabilized.copy(_positionMean).add(_diffPosition);

          // compute stabilized quaternion:
          const diffAngle = _quaternionMean.angleTo(threeQuaternion);
          const angleStabilized = stabilize_diffComponent(diffAngle, angleSigma, _spec.sigmaAngleThreshold, _velocityAngleMean, _sumDt, 'a');
          _quaternionStabilized.copy(_quaternionMean).rotateTowards(threeQuaternion, angleStabilized);

          // debug means. It will stabilize but add a lot of latency:
          //_positionStabilized.copy(_positionMean);
          _quaternionStabilized.copy(_quaternionMean);

          apply_positionQuaternion(_positionStabilized, _quaternionStabilized);
          increment_cursor();
        },


        reset: function(){
          _counter = 0;
        }
      };
      return that;
    } // end instance()
  } // end class return value
})(); 


export default WebARRocksThreeStabilizer;
