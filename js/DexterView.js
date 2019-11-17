var Environment = function (goldenContainer) {
    this.time = new THREE.Clock();
    this.time.autoStart = true;
    this.lastTimeRendered = 0.0;
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 2000); //new THREE.OrthographicCamera(300 / - 2, 300 / 2, 300 / 2, 300 / - 2, 1, 1000);
    this.scene = new THREE.Scene();
    this.isVisible = true;
    //this.orbit = document.currentScript.getAttribute("orbit") == "enabled";
    //this.square = document.currentScript.getAttribute("square") == "enabled";
    this.viewDirty = true; this.goldenContainer = goldenContainer;
  
    this.initEnvironment = function () {
      this.camera.position.set(50, 100, 150);
      this.camera.lookAt(0, 45, 0);
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xffffff);//0xa0a0a0
      this.scene.fog = new THREE.Fog(0xffffff, 200, 600);//0xa0a0a0
  
      var light = new THREE.HemisphereLight(0xffffff, 0x444444);
      light.position.set(0, 200, 0);
      this.light2 = new THREE.DirectionalLight(0xbbbbbb);
      this.light2.position.set(0, 200, 100);
      this.light2.castShadow = true;
      this.light2.shadow.camera.top = 180;
      this.light2.shadow.camera.bottom = - 100;
      this.light2.shadow.camera.left = - 120;
      this.light2.shadow.camera.right = 120;
      this.scene.add(light);
      this.scene.add(this.light2);
      //scene.add(new THREE.CameraHelper(light.shadow.camera));
      var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
      mesh.rotation.x = - Math.PI / 2;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      var grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
      grid.material.opacity = 0.3;
      grid.material.transparent = true;
      this.scene.add(grid);
  
      var curCanvas = document.createElement('canvas');
      //curCanvas.id = canvasId;
      //document.currentScript.parentNode.insertBefore(curCanvas, document.currentScript.nextSibling);
      goldenContainer.getElement().get(0).appendChild(curCanvas);
      this.renderer = new THREE.WebGLRenderer({ canvas: curCanvas, antialias: true });
      this.renderer.setPixelRatio(1);
      var parentWidth  = this.goldenContainer.width;
      let parentHeight = this.goldenContainer.height;
      this.renderer.setSize(parentWidth, parentHeight);
      this.renderer.shadowMap.enabled = true;
      this.camera.aspect = parentWidth / parentHeight;
      this.camera.updateProjectionMatrix();

      this.goldenContainer.on('resize', this.onWindowResize.bind(this));
  
      this.draggableObjects = [this.ludic];
      //this.dragControls = new THREE.DragControls(this.draggableObjects, this.camera, this.renderer.domElement);
  
      //if (this.orbit) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 45, 0);
        this.controls.panSpeed = 2;
        this.controls.zoomSpeed = 1;
        this.controls.screenSpacePanning = true;
        this.controls.update();
        this.controls.addEventListener('change', () => this.viewDirty = true);
        //this.dragControls.addEventListener('dragstart', (data) => { this.controls.enabled = false;  data.object._isDragging = true; });
        //this.dragControls.addEventListener('dragend', (data) => { this.controls.enabled = true; data.object._isDragging = false; });
      //}
      //this.dragControls.addEventListener('drag', () => this.viewDirty = true);
    }

    this.onWindowResize = function () {
        this.camera.aspect = this.goldenContainer.width / this.goldenContainer.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.goldenContainer.width, this.goldenContainer.height);
        this.renderer.render(this.scene, this.camera);
    }
  
    this.initEnvironment();
  }
  
  var DexterEnvironment = function (goldenContainer) {
    this.goldenContainer = goldenContainer;
    this.environment = new Environment(this.goldenContainer);
    this.updating = false;
  
    this.IKJoints = [];
    this.endEffector = null;
    this.boxGeometry = new THREE.BoxBufferGeometry(100, 100, 100);
    this.white = new THREE.MeshLambertMaterial({ color: 0x888888 });
  
    this.initArm = function () {
      //Assemble the Robot Arm
      this.base         = this.addJoint(this.environment.scene, [0, 0, 0], [0, 1, 0], [0, 0], [0.05, 0.1, 0.05], [0, 5, 0]);
      this.firstJoint   = this.addJoint(base,        [0, 11.52001, 0], [0, 1, 0], [-180, 180], [0.1, 0.1, 0.1], [0, 2.5, 0]);
      this.secondJoint  = this.addJoint(firstJoint,  [-6.55, 4.6, 0.0], [1, 0, 0], [-90, 90], [0.1, 0.45, 0.1], [-3.450041, 14.7, 0]);
      this.thirdJoint   = this.addJoint(secondJoint, [1.247041, 32.02634, -0.0739485], [1, 0, 0], [-150, 150], [0.05, 0.35, 0.05], [2.8, 15.14, 0]);
      this.fourthJoint  = this.addJoint(thirdJoint,  [2.984276, 30.01859, 0.0], [1, 0, 0], [-130, 130], [0.05, 0.05, 0.05], [4.8, 0.17, 0]);
      this.fifthJoint   = this.addJoint(fourthJoint, [4.333822, 4.200262, 0.0], [0, 1, 0], [-180, 180], [0.1, 0.035, 0.035], [3.156178, 0.3, 0]);
      this.endEffector = new THREE.Group();
      fifthJoint.add(this.endEffector);
      this.endEffector.position.set(8.3, 1.0, 0.0);
  
      //var target = new THREE.Mesh(this.boxGeometry, new THREE.MeshPhongMaterial({ color: 0x3399dd }));
      //target.position.set(0, 100, 0);
      //target.scale.set(0.075, 0.075, 0.075);
      //target.castShadow = true;
      //this.environment.scene.add(target);
      //this.environment.draggableObjects.unshift(target);

      this.goldenContainer.layoutManager.eventHub.on('poseUpdate', (data) => this.setArmAngles(data));
      this.goldenContainer.layoutManager.eventHub.emit('Start');
    }
  
    this.addJoint = function (base, position, axis, limits, size, graphicsOffset) {
      let joint = new THREE.Group();
      base.add(joint);
      joint.position.set(position[0], position[1], position[2]);
      joint.axis     = new THREE.Vector3(axis[0], axis[1], axis[2]);
      joint.minLimit = limits[0] * 0.0174533;
      joint.maxLimit = limits[1] * 0.0174533;
      this.IKJoints.push(joint);
      let box = new THREE.Mesh(this.boxGeometry, this.white);
      joint.add(box);
      box.scale.set(size[0], size[1], size[2]);
      box.position.set(graphicsOffset[0], graphicsOffset[1], graphicsOffset[2]);
      box.castShadow = true;
      return joint;
    }

    this.setArmAngles = function (data) {
        //console.log("GOT ARM ANGLE DATA!");
        let jointRotation = new THREE.Vector3();
        let jointNumber = 0;
        for (var i = 10; i < 60; i+=10) {
            let totalRotation = (data.pose[i] + (data.pose[i+1]/(jointNumber > 2 ? 8.0 : 1.0)) + data.pose[i+3])/230400.0;
            let baseOrYaw = (jointNumber == 4) || (jointNumber == 0);
            jointRotation.set(
                baseOrYaw ? 0.0 : totalRotation, 
                baseOrYaw ? -totalRotation : 0.0, 
                0.0);
            //console.log(jointRotation);
            this.IKJoints[jointNumber+1].rotation.setFromVector3(jointRotation);
            jointNumber++;
        }
    }
  
    this.animate = function animatethis() {
      requestAnimationFrame(() => this.animate());
      this.goldenContainer.layoutManager.eventHub.emit('Update');
      this.environment.renderer.render(this.environment.scene, this.environment.camera);
    };
  
    this.initArm();
    this.animate();
    // Initialize the view in-case we're lazy rendering...
    this.environment.renderer.render(this.environment.scene, this.environment.camera);
  }
