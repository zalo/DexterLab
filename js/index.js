var myLayout, monacoEditor, loadedState, 
dexterViewport, consoleContainer, gui, dexWS, 
GUIState, connectWebsocket, disconnectWebsocket, 
sendCommand, GUIState, count = 0, focused = true;

let starterCode = 
`// Welcome to DexBench Programming Environment!
// Please make sure your Dexter is turned on and the 
// 'ip' is set to the Dexter's IP.  Then press "Connect".
// This code is saved to your localStorage, so don't be afraid to leave and come back!

// GUI uses https://github.com/automat/controlkit.js
gui.addPanel({label: 'Dexter Control Panel'})
   .addStringInput(GUIState,            'ip', { label: 'IP Addr'} )
   .addButton     ('Connect',           () => { connect();      } )
   .addButton     ('Disconnect',        () => { disconnect();   } )
   .addButton     ('Home Axes',         () => { homeAxes();     } )
   .addButton     ('Bend Elbow',        () => { bendAxes();     } )
   .addButton     ('Follow Me',         () => { followMe();     } )
   .addButton     ('Keep Position',     () => { keepPosition(); } );

function connect()        { connectWebsocket(GUIState['ip']); }
function disconnect()     { disconnectWebsocket();            }
function homeAxes()       { sendCommand("a 0 0 0 0 0 0 0 ;"); }
function bendAxes()       { sendCommand("a 0 0 100000 0 0 0 0 ;"); }
function followMe()       { sendCommand("S RunFile setFollowMeMode.make_ins ;"); }
function keepPosition()   { sendCommand("S RunFile setKeepPositionMode.make_ins ;"); }
`;

// Functions to be overwritten by the editor window
//function Update(){}

function initialize(){
    // Set up the Windowing System  ---------------------------------------
    loadedState = localStorage.getItem( 'savedState' );
    if( loadedState !== null ) {
        myLayout = new GoldenLayout( JSON.parse( loadedState ) );
    } else {
        myLayout = new GoldenLayout( {
            content: [{
                type: 'row',
                content:[{
                    type: 'component',
                    componentName: 'robotView',
                    title:'Dexter View',
                    componentState: { ip: '192.168.1.142:3000' },
                    isClosable: false
                },{
                    type: 'column',
                    content:[{
                        type: 'component',
                        componentName: 'codeEditor',
                        title:'Code Editor',
                        componentState: { code: starterCode },
                        isClosable: false
                    },{
                        type: 'component',
                        componentName: 'console',
                        title:'Console',
                        height: 20.0,
                        isClosable: false
                    }]
                }]
            }],
            settings:{
                showPopoutIcon: false,
                showMaximiseIcon: false,
                showCloseIcon: false
            }
        } );
    }

    // Set up saving code changes to the localStorage
    myLayout.on( 'stateChanged', function(){
        localStorage.setItem( 'savedState', JSON.stringify( myLayout.toConfig()));
    });

    // Set up the Monaco Code Editor
    myLayout.registerComponent('codeEditor', function(container, state){
        setTimeout(()=>{

            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                allowNonTsExtensions: true,
                allowJs: true,
                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
            });
            monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

            // Golden Layout Typescript definitions...
            fetch("./node_modules/golden-layout/index.d.ts").then((response) => {
                response.text().then(function (text) {
                    monaco.languages.typescript.javascriptDefaults.addExtraLib(text, 'file:///node_modules/golden-layout/index.d.ts');
                });
            }).catch(error => console.log(error.message));

            // Three.js Typescript definitions...
            fetch("./node_modules/three/build/three.d.ts").then((response) => {
                response.text().then(function (text) {
                    monaco.languages.typescript.javascriptDefaults.addExtraLib(text, 'file:///node_modules/three/build/three.d.ts');
                });
            }).catch(error => console.log(error.message));

            // Add Symbols from ControlKit.js...
            fetch("./node_modules/controlkit/bin/controlkit.d.ts").then((response) => {
                response.text().then(function (text) {
                    monaco.languages.typescript.javascriptDefaults.addExtraLib(text, 'file:///node_modules/controlkit/bin/controlkit.d.ts');
                });
            }).catch(error => console.log(error.message));

            // Add Symbols from this file...
            fetch("./js/index.ts").then((response) => {
                response.text().then(function (text) {
                    monaco.editor.createModel(text, "javascript");
                });
            }).catch(error => console.log(error.message));

            monacoEditor = monaco.editor.create(container.getElement().get(0), {
                value: state.code,
                language: "javascript",
                theme: "vs-dark",
                automaticLayout: true//,
                //model: null
            });

            // Refresh the code once every couple seconds if necessary
            setInterval(()=>{ 
                let newCode = monacoEditor.getValue();
                if(newCode !== container.getState().code){
                    // Clear Errors
                    monaco.editor.setModelMarkers(monacoEditor.getModel(), 'test', []);
                    consoleContainer.innerHTML = "";

                    gui.clearPanels();

                    window.eval(newCode); 
                }
                container.setState({ code: newCode });
            }, 2000);

            window.eval(state.code); 
        }, 1);
    });

    // Set up the 3D Viewport into the Robot
    myLayout.registerComponent('robotView', function(container, state){
        GUIState = state;
        container.setState(GUIState);
        setTimeout(()=> { 
            let floatingGUIContainer = document.createElement("div");
            floatingGUIContainer.style.position = 'absolute';
            floatingGUIContainer.id = "dexterViewportContainer";
            container.getElement().get(0).appendChild(floatingGUIContainer);
            gui            = new ControlKit({parentDomElementId: "dexterViewportContainer"});
            dexterViewport = new DexterEnvironment(container); 
        }, 1.3);
    });

    // Set up the 3D Viewport into the Robot
    myLayout.registerComponent('console', function(container){
        consoleContainer = document.createElement("div");
        consoleContainer.style.color = "white";
        container.getElement().get(0).appendChild(consoleContainer);
        container.getElement().get(0).style.overflow = 'auto';
        container.getElement().get(0).style.boxShadow = "inset 0px 0px 3px rgba(0,0,0,0.75)";

        const getCircularReplacer = () => {
            const seen = new WeakSet();
            return (key, value) => {
              if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                  return;
                }
                seen.add(value);
              }
              return value;
            };
          };

        // Overwrite the existing logging/error behaviour
        let realConsoleLog = console.log;
        console.log = function(message) {
            let newline = document.createElement("div");
            newline.innerHTML = "&gt;  " + JSON.stringify(message, getCircularReplacer());
            consoleContainer.appendChild(newline);
            consoleContainer.parentElement.scrollTop = consoleContainer.parentElement.scrollHeight;
            realConsoleLog.apply(console, arguments);
        };
        window.onerror = function(error, url, line) {
            let newline = document.createElement("div");
            newline.style.color = "red";
            newline.innerHTML = "Line : "+line + " " + JSON.stringify(error, getCircularReplacer());
            consoleContainer.appendChild(newline);
            consoleContainer.parentElement.scrollTop = consoleContainer.parentElement.scrollHeight;

            // Highlight the error'd code in the editor
            monaco.editor.setModelMarkers(monacoEditor.getModel(), 'test', [{
                startLineNumber: line,
                startColumn: 1,
                endLineNumber: line,
                endColumn: 1000,
                message: JSON.stringify(error, getCircularReplacer()),
                severity: monaco.MarkerSeverity.Error
            }]);
        };
    });

    // Set up the Websocket Connection to the Dexter ----------------------
    var pulse = setInterval(function(){ getDexterStatus(); }, 16);
    connectWebsocket = function (ipAndPort) {
        //disconnectWebsocket();
        console.log("Attempting to connect to Dexter at "+ipAndPort+"...");
        dexWS = new WebSocket('ws://' + ipAndPort);
        dexWS.binaryType = "arraybuffer"; //avoids the blob
        dexWS.onopen = () => {
            console.log("Dexter Connected at "+ipAndPort+"!")
            self.status = "open";
            pulse = setInterval(function(){ getDexterStatus(); }, 16);
        }
        dexWS.onerror = function (error) {
            self.status = "error" + error;
            console.log("Connection Failed! Either restart your robot or check your IP and try again. See your browser's error console for more details.");
        }
        dexWS.onmessage = function (socket) {
            let msg = "" //start new message
            data = new Int32Array(socket.data);
            if (data.length == 0) {
                console.log("Connection to Dexter Lost; Retrying..."); 
                dexWS.close();
                setTimeout(()=>{
                    connectWebsocket(ipAndPort);
                }, 1000);
                return; 
            }
            let op = String.fromCharCode(data[4]);
            if (data[5] > 0) { msg += "Error:" + data[5] + " on oplet:" + op; }
            switch (op) {
                case 'r':
                    //console.log("r " + String.fromCharCode.apply(null, new Uint8Array(msg.data.slice(7*4))))
                    let l = data[6]; //length of returned data
                    msg += '-> r ' + l + ' "';
                    msg += String.fromCharCode.apply(null, new Uint8Array(socket.data.slice(7 * 4, 7 * 4 + l)));
                    msg += '"';
                    break;
                case 'g':
                    myLayout.eventHub.emit( 'poseUpdate', { pose: data } );
                    break;
                //1,0,1531787828,349602,103,0,0,0,0,0,0,0,0,0,3703,2967,0,0,0,2147483647,0,0,0,0,293,56,0,0,0,2147483647,0,0,0,0,809,3063,0,0,0,2147483647,0,0,0,0,1682,3675,0,0,0,2147483647,0,0,0,0,1990,218,0,0,0,2147483647
            }
            if (msg) console.log(msg);
        }
    }

    disconnectWebsocket = function(){
        if(dexWS && dexWS.readyState == 1){ 
            clearInterval(pulse);
            setTimeout(()=>{ dexWS.close(); }, 100);
            console.log("Disconnected from Dexter!");
        }else{
            console.log("Dexter already disconnected!");
        }
    }

    sendCommand = function (command) { 
        if(dexWS && dexWS.readyState == 1){ 
            console.log("Sending Command: '"+command+"'...");
            dexWS.send("1 " + (count++) + " 1 undefined " + command); 
        }else{
            console.log("Dexter Not Connected!");
        }
    }

    window.onbeforeunload = function(){
        if(dexWS && dexWS.readyState == 1){ 
            disconnectWebsocket();
            return "Disconnecting Websocket Connection...";
        }
    }

    function getDexterStatus() { 
        if(dexWS && dexWS.readyState == 1 && focused){ 
            dexWS.send("1 " + (count++) + " 1 undefined g ;"); 
        } 
    }

    window.onblur  = function (){ focused = false; }
    window.onfocus = function (){ focused = true;  }
    document.onblur = window.onblur; document.onfocus = window.onfocus;

    myLayout.init();
}
