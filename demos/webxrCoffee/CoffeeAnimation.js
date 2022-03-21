/*
Coffee Animation
Dependancies:
- THREE.JS (>v95)
- Tween.js
- TeapotBufferGeometry.js
*/


const CoffeeAnimation = (function(){

  const _settings = {
    particlesCount: 330,
    
    // animation timing (in ms):
    particleFallDuration: 1000,
    stopParticlesAfter: 3000,
    animationDuration: 3500,

    // colors and lighting:
    teapotColor: 0xffffff,
    ambientLightColor: 0xffccaa,
    ambientLightIntensity: 0.5,
    directionalLightColor: 0xffffff,
    directionalLightIntensity: 0.6,
  };

  const _threeObjects = {
    main: null,
    particles: null,
    teapot: null,
    mainWrapper: null
  };

  let _spec = null;
  const _timers = [];
  const _states = {
    notLoaded: -2,
    loading: -1,
    idle: 0,
    potRotating: 1,
    potFlowing: 2,
    potFlowingEnd: 3
  };
  let _state = _states.notLoaded;

  const _specDefault = {
    assetsPath: ''
  };

  //BEGIN PARTICLE FUNCTIONS
  // particle system is inspired from: https://threejs.org/examples/#canvas_particles_sprites
  function init_particles(){
    _threeObjects.particles = new THREE.Object3D();
    _threeObjects.main.add(_threeObjects.particles);
    _threeObjects.particles.visible = false;

    const material = new THREE.SpriteMaterial( {
      map: new THREE.TextureLoader().load( _spec.assetsPath + 'coffeeSprite.png' ),
      blending: THREE.NormalBlending,
    } );

    for ( let i = 0; i < _settings.particlesCount; ++i ) {
      const particle = new THREE.Sprite( material );
      _threeObjects.particles.add( particle );
    }
  }

  function start_particles(){
    _threeObjects.particles.visible = true;
    _threeObjects.particles.children.forEach(function(particle, i){
      init_particle( particle, i * 3 );
    });
  }

  function stop_particles(){
    _state = _states.potFlowingEnd;
  }

  function init_particle( particle0, delay0 ) {
    const particle = (this instanceof THREE.Sprite) ? this : particle0;
    if (_state !== _states.potFlowing){
      particle.visible = false;
      return;
    }
    particle.visible = true;

    const delay = (delay0 !== undefined) ? delay0 : 0;

    particle.position.set( 0, 0, 0 );
    particle.scale.x = particle.scale.y = Math.random() * 0.003 + 0.008;

    new TWEEN.Tween( particle )
      .delay( delay )
      .to( {}, _settings.particleFallDuration )
      .onComplete( init_particle )
      .start();

    new TWEEN.Tween( particle.position )
      .delay( delay )
      .to({ x: Math.random() * 0.01 - 0.005 + 0.002*Math.cos(Date.now()/50)+ 0.05,
          z: Math.random() * 0.01 - 0.005 + 0.002*Math.sin(Date.now()/60)}, _settings.particleFallDuration )
      .start();

    new TWEEN.Tween( particle.position )
      .easing(TWEEN.Easing.Quadratic.In)
      .delay( delay )
      .to({ y: -0.2}, _settings.particleFallDuration )
      .start();

    new TWEEN.Tween( particle.scale )
      .delay( delay )
      .to( { x: 0.005+Math.random()*0.003, y: 0.018+Math.random()*0.003 }, _settings.particleFallDuration )
      .start();
  }
  //END PARTICLES

  //BEGIN TEAPOT
  function init_teaPot(){
    const teapotGeometry = new THREE.TeapotBufferGeometry(0.06, 8);
    const teapotMaterial = new THREE.MeshLambertMaterial({
      color: _settings.teapotColor,
      side: THREE.DoubleSide
    });
    _threeObjects.teapot = new THREE.Mesh(teapotGeometry, teapotMaterial);
    _threeObjects.teapot.position.set(-0.09,0.085,0)
    _threeObjects.main.add(_threeObjects.teapot);

    const dLight = new THREE.DirectionalLight( _settings.directionalLightColor, _settings.directionalLightIntensity );
    const aLight = new THREE.AmbientLight( _settings.ambientLightColor, _settings.ambientLightIntensity );
    _threeObjects.main.add(aLight, dLight);
  }


  function start_teapotRotation(onComplete){
    _threeObjects.teapot.rotation.z = 0; // horizontal position
    const delay = 500;

    // we cannot tween rotation directly.
    // see: https://stackoverflow.com/questions/30769091/tween-js-rotation-not-working-when-using-three-js-loader
    const tweenRot = {z: 0}; 
    new TWEEN.Tween( tweenRot )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .delay( delay )
      .to({ z: -Math.PI/3}, 1000 )
      .onUpdate(function() {
        _threeObjects.teapot.rotation.z = tweenRot.z;
      })
      .onComplete( onComplete )
      .start();
  }
  //END TEAPOT

  /*
   * spec properties:
   * <string> assetsPath: where to find the assets
   */  
  const that = {
    init: function(spec){
      if (_state !== _states.notLoaded){
        return;
      }

      _spec = (spec) ? Object.assign({}, _specDefault, spec) : _specDefault;

      _state = _states.loading;

      _threeObjects.main = new THREE.Object3D();
      _threeObjects.main.visible = false;

      _threeObjects.mainWrapper = new THREE.Object3D();
      _threeObjects.mainWrapper.add(_threeObjects.main);
      
      init_teaPot();
      init_particles();

      // move _threeObject so that the bottom of the coffee flow match with the origin
      _threeObjects.main.position.set(-0.05, 0.21, 0);
      
      _state = _states.idle;
      
      return _threeObjects.mainWrapper;
    },


    // start the animation:
    start: function(onComplete){
      if (_state !== _states.idle){
        return false;
      }
      _state = _states.potRotating;
      _threeObjects.main.visible = true;

      start_teapotRotation(function(){
        _state = _states.potFlowing;
        start_particles();
        _timers.push(
          setTimeout(stop_particles, _settings.stopParticlesAfter),
          setTimeout(function(){
            _threeObjects.main.visible = false;
            _state = _states.idle;
            if (onComplete){
              onComplete();
            }
          }, _settings.animationDuration)
        ); //end timers.push
      }); //end start_teapotRotation callback

      return true;
    },


    // reset the animation:
    reset: function(){
      _threeObjects.main.visible = false;
      _threeObjects.particles.visible = false;
      TWEEN.removeAll();
      _timers.forEach(function(timer){
        clearTimeout(timer);
      });
      _timers.splice(0, _timers.length);
      _state = _states.idle;
    },


    // should be executed at each rendering loop
    update: function(){
      TWEEN.update();
    }
  };

  return that;
})();
