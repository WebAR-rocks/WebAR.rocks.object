import React, { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

// import main helper:
import threeHelper from '../contrib/WebARRocksObject/helpers/WebARRocksObjectThreeHelper.js'

// import mediaStream API helper:
import mediaStreamAPIHelper from '../contrib/WebARRocksObject/helpers/WebARRocksMediaStreamAPIHelper.js'

// import neural network model:
import NN from '../contrib/WebARRocksObject/neuralNets/NN_KEYBOARD_5.json'

import BackButton from '../components/BackButton'


let _threeFiber = null


// This mesh follows the object. put stuffs in it.
// Its position and orientation is controlled by the THREE.js helper
const ObjectFollower = (props) => {
  // This reference will give us direct access to the mesh
  const objRef = useRef()
  useEffect(() => {
    const threeObject3D = objRef.current
    threeHelper.set_objectFollower('KEYBOARD', threeObject3D)
  })

  const s = 0.5
  
  return (
    <object3D ref = {objRef}>
      <mesh name="debugCube" position={[0, s/2, 0]}>
        <boxBufferGeometry args={[s, s, s]} />
        <meshNormalMaterial />
      </mesh>
    </object3D>
  )
}


// fake component, display nothing
// just used to get the Camera and the renderer used by React-fiber:
const ThreeGrabber = (props) => {
  const threeFiber = useThree()
  _threeFiber = threeFiber
  useFrame(() => {
    threeHelper.update_threeCamera(props.sizing, threeFiber.camera)
    threeHelper.update_poses(threeFiber.camera)
  })
  return null
}


const compute_sizing = () => {
  // compute  size of the canvas:
  const height = screen.availHeight
  const width = window.innerWidth
  
  // compute position of the canvas:
  const top = 0
  const left = 0
  return {width, height, top, left}
}


const Keyboard = (props) => {
  // init state:
  const [sizing, setSizing] = useState(compute_sizing())
  const [isInitialized] = useState(true)

  // refs: 
  const canvasComputeRef = useRef()
  const cameraVideoRef = useRef()

  const _settings = {
    nDetectsPerLoop: 0, // 0 -> adaptative

    loadNNOptions: {
      notHereFactor: 0.0,
      paramsPerLabel: {
        KEYBOARD: {
          thresholdDetect: 0.7
        }
      }
    },

    detectOptions: {
      isKeepTracking: true,
      isSkipConfirmation: false,
      thresholdDetectFactor: 1,
      thresholdDetectFactorUnstitch: 0.2,
      trackingFactors: [0.2, 0.2, 0.2]
    },

    cameraFov: 0, // auto evaluation
    scanSettings:{
      nScaleLevels: 2,
      scale0Factor: 0.8,
      overlapFactors: [2, 2, 3],
      scanCenterFirst: true,
      scaleXRange: [1/15, 1.2]
    },

    followZRot: true,
  }
  let _timerResize = null
  
        
  const handle_resize = () => {
    // do not resize too often:
    if (_timerResize){
      clearTimeout(_timerResize)
    }
    _timerResize = setTimeout(do_resize, 200)
  }


  const do_resize = () => {
    _timerResize = null
    const newSizing = compute_sizing()
    setSizing(newSizing)
  }


  useEffect(() => {
    if (!_timerResize && _threeFiber){
      _threeFiber.gl.setSize(sizing.width, sizing.height, true)
    }
  }, [sizing])

 
  useEffect(() => {
    // when videofeed is got, init WebAR.rocks.object through the threeHelper:
    const onCameraVideoFeedGot = () => {
      threeHelper.init({
        video: cameraVideoRef.current,
        ARCanvas: canvasComputeRef.current,
        NN,
        sizing,
        callbackReady: () => {
          // handle resizing / orientation change:
          window.addEventListener('resize', handle_resize)
          window.addEventListener('orientationchange', handle_resize)
        },
        loadNNOptions: _settings.loadNNOptions,
        nDetectsPerLoop: _settings.nDetectsPerLoop,
        detectOptions: _settings.detectOptions,
        cameraFov: _settings.cameraFov,
        followZRot: _settings.followZRot,
        scanSettings: _settings.scanSettings,
        stabilizerOptions: {n: 3}
      })
    }

    // get videoFeed:
    mediaStreamAPIHelper.get(cameraVideoRef.current, onCameraVideoFeedGot, (err) => {
      reject('Cannot get video feed ' + err)
    }, {
      video: { // put your video constraints here:
        width:  {min: 640, max: 1920, ideal: 1280},
        height: {min: 640, max: 1920, ideal: 720},      
        facingMode: {ideal: 'environment'}
      },
      audio: false
    })

   return threeHelper.destroy
  }, [isInitialized])

  const commonStyle = {
    left: '50%',
    minHeight: '100vh',
    minWidth: '100vw',
    position: 'fixed',
    top: '50%',
    transform: 'translate(-50%, -50%)'      
  }

  const cameraVideoStyle = {
    zIndex: 1,
    top: 0,
    left: 0,
    position: 'fixed',
    objectFit: 'cover',
    width: '100vw',
    height: '100%'
  }

  return (
    <div>
      {/* Canvas managed by three fiber, for AR: */}
      <Canvas style={Object.assign({
        zIndex: 10,
        width: sizing.width,
        height: sizing.height
      }, commonStyle)}
      gl={{
        preserveDrawingBuffer: true // allow image capture
      }}
      updateDefaultCamera = {false}
      >
        <ThreeGrabber sizing={sizing} />
        <ObjectFollower />
      </Canvas>

      {/* Video */}
      <video style={cameraVideoStyle} ref={cameraVideoRef}></video>

      {/* Canvas managed by WebAR.rocks.object, used for WebGL computations) */}
      <canvas ref={canvasComputeRef} style={{display: 'none'}} width={512} height={512} />

      <BackButton />
    </div>
  )
} 

export default Keyboard
