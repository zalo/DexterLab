var myLayout : GoldenLayout.GoldenLayout;
var gui : ControlKit.ControlKit;
var dexWS : WebSocket;

interface Environment {
    constructor(goldenContainer: any);

    time      : THREE.Clock;
    lastTimeRendered : Number;
    camera    : THREE.PerspectiveCamera; 
    scene     : THREE.Scene;
    renderer  : THREE.WebGLRenderer;
    controls  : THREE.OrbitControls;
    isVisible : Boolean;
    viewDirty : Boolean; 

    initEnvironment(): void;
    onWindowResize(): void;
}

interface Joint extends THREE.Group {
    constructor(goldenContainer: any);
    axis : THREE.Vector3;
    minLimit : Number;
    maxLimit : Number;
}

interface DexterEnvironment {
    constructor(goldenContainer: any);

    environment : Environment;
    updating    : Boolean;
    IKJoints    : THREE.Group[];
    boxGeometry : THREE.BoxBufferGeometry;
    white       : THREE.MeshLambertMaterial;
    base        : THREE.Group;
    firstJoint  : THREE.Group;
    secondJoint : THREE.Group;
    thirdJoint  : THREE.Group;
    fourthJoint : THREE.Group;
    fifthJoint  : THREE.Group;
    endEffector : THREE.Group;

    initArm(): void;
    addJoint(base : THREE.Group, position : Number[], axis : Number[], limits:Number[], size:Number[], graphicsOffset:Number[]): Joint;
    setArmAngles(data:Number[]) : void;
    animate() : void;
}

var dexterViewport : DexterEnvironment;
