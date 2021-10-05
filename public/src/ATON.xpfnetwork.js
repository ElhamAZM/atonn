/*
    ATON XPF Network

    Network manager of eXtended Panoramic Frames (XPFs)
    formerly "DPF": http://osiris.itabc.cnr.it/scenebaker/index.php/projects/dpf/

    author: bruno.fanini_AT_gmail.com

===========================================================*/

/**
ATON XPF Network.
The XPF Network component allows to handle several XPFs and their interconnections
@namespace XPFNetwork
*/
let XPFNetwork = {};

XPFNetwork.STD_XPF_TRANSITION_DURATION = 1.0;
XPFNetwork.SEM_PREFIX      = "XPF";
XPFNetwork.SEMGROUP_PREFIX = "GXPF";


XPFNetwork.init = ()=>{
    XPFNetwork._list  = [];

    XPFNetwork._iCurr = undefined;
    XPFNetwork._iNext = undefined;

    XPFNetwork._group = new THREE.Group();
    ATON._rootVisibleGlobal.add( XPFNetwork._group );

    XPFNetwork._geom = undefined;
    XPFNetwork._mesh = undefined;
    XPFNetwork._mat  = undefined;
    XPFNetwork._size = 50.0;

    XPFNetwork._gSem = [];

    XPFNetwork._txCache = {};

    XPFNetwork._pathMod = undefined;
};

XPFNetwork.setPathModifier = (f)=>{
    if (f === undefined) return;

    XPFNetwork._pathMod = f;
    for (let x in XPFNetwork.list) XPFNetwork.list[x].setPathModifier(f);
};

// This is required to select closest (current) XPF to user location
XPFNetwork.update = ()=>{
    //if (ATON.Nav.isTransitioning()) return;
    if (XPFNetwork._list.length < 1) return;

    let len = XPFNetwork._list.length;
    
    // Get current viewpoint
    let E = ATON.Nav._currPOV.pos;
    let V = ATON.Nav._vDir;

    let mindist  = undefined;
    let iclosest = undefined;

    let nxdist   = undefined;
    let inext    = undefined;

    if (XPFNetwork._dirLNode === undefined) XPFNetwork._dirLNode = new THREE.Vector3();

    for (let i=0; i<len; i++){
        let xpf = XPFNetwork._list[i];

        // Search closest
        let d = E.distanceToSquared(xpf._location);
        if (mindist === undefined || d < mindist){
            mindist  = d;
            iclosest = i;
        }

        // Seek next in sight
        // TODO: provide custom routine
        if (i !== XPFNetwork._iCurr){
            XPFNetwork._dirLNode.x = xpf._location.x - E.x;
            XPFNetwork._dirLNode.y = xpf._location.y - E.y;
            XPFNetwork._dirLNode.z = xpf._location.z - E.z;
            XPFNetwork._dirLNode   = XPFNetwork._dirLNode.normalize();

            let v = XPFNetwork._dirLNode.dot(V);
            if (v > 0.8){
                if (nxdist === undefined || d < nxdist){
                    nxdist = d;
                    inext  = i;
                }
            }
        }
    }

    //console.log(inext);
/*
    if (inext !== undefined){
        //XPFNetwork._preloadBaseLayer(inext);
        ////XPFNetwork._list[inext]._lnode.toggleSUI(true);

        if (inext !== XPFNetwork._iNext) ATON.fireEvent("NextXPF", inext);
        XPFNetwork._iNext = inext;
    }
*/
    if (inext !== XPFNetwork._iNext) ATON.fireEvent("NextXPF", inext);
    XPFNetwork._iNext = inext;

    if (iclosest === XPFNetwork._iCurr) return;

    // We change XPF
    if (XPFNetwork._iCurr !== undefined) XPFNetwork._gSem[XPFNetwork._iCurr].hide();
    
    XPFNetwork.setCurrentXPF(iclosest);

    //XPFNetwork._clearTexCache(); // Clear cached textures

    ATON.fireEvent("CurrentXPF", iclosest);
};

XPFNetwork.realizeBaseGeometry = ()=>{
    if (XPFNetwork._geom !== undefined) return; // already realized

    // Default geometry
    XPFNetwork._geom = new THREE.SphereBufferGeometry( 1.0, 60,60 );
    XPFNetwork._geom.scale( -XPFNetwork._size, XPFNetwork._size, XPFNetwork._size );
        
    XPFNetwork._geom.castShadow    = false;
    XPFNetwork._geom.receiveShadow = false;

    XPFNetwork._mat = new THREE.MeshBasicMaterial({ 
        //map: tpano,
        ///emissive: tpano,
        //fog: false,
        
        depthTest: false,
        depthWrite: false,
        
        ///depthFunc: THREE.AlwaysDepth,
        //side: THREE.BackSide, // THREE.DoubleSide
    });

    XPFNetwork._mesh = new THREE.Mesh(XPFNetwork._geom, XPFNetwork._mat);
    XPFNetwork._mesh.frustumCulled = false;
    XPFNetwork._mesh.renderOrder   = -100;

    XPFNetwork._mesh.layers.enable(ATON.NTYPES.SCENE);

    XPFNetwork._group.add( XPFNetwork._mesh );
    XPFNetwork._mesh.visible = false;
};

// TODO:
XPFNetwork.setBaseGeometry = (geom)=>{
    //xxx.geometry.dispose();
    //xxx.geometry = geom;
};

/**
Add a XPF to the Network
@param {XPF} xpf - A XPF object
@example
ATON.XPFNetwork.add( myXPF )

@example
ATON.XPFNetwork.add( new ATON.XPF().setLocation(10,0,3).setBaseLayer("my/pano.jpg") )
*/
XPFNetwork.add = (xpf)=>{
    if (xpf === undefined) return;

    XPFNetwork.realizeBaseGeometry();

    let i = XPFNetwork._list.length;
    XPFNetwork._list.push(xpf);

    //xpf._lnode.associateToXPF(i);

    // If this XPF has custom mesh
    let m = xpf.getMesh();
    if (m) XPFNetwork._group.add( m );

    // Sem group
    let sem = ATON.getOrCreateSemanticNode(XPFNetwork.SEMGROUP_PREFIX+i); // e.g. "GXPF0"
    XPFNetwork._gSem.push( sem );
    sem.attachToRoot();

    // Setup nav system
    if (i > 0) return;
    ATON.Nav.toggleLocomotionValidator(false);
    ATON._bqScene = true;
};

XPFNetwork.clear = ()=>{
    XPFNetwork._iCurr = undefined;
    XPFNetwork._iNext = undefined;

    for (let i=0; i<XPFNetwork._list.length; i++){
        // TODO:
    }

};

/**
Get main XPF network group (to transform or manipulate the entire XPF network)
@returns {THREE.Group}
*/
XPFNetwork.getMainGroup = ()=>{
    return XPFNetwork._group;
};

/**
Get semantic group for a given XPF
@param {number} i - The XPF index
@returns {Node} - The semantic ATON node holding all annotations
*/
XPFNetwork.getSemanticGroup = (i)=>{
    return XPFNetwork._gSem[i];
};

/**
Get semantic group for current (active) XPF
@returns {Node} - The semantic ATON node holding all annotations
*/
XPFNetwork.getCurrentSemanticGroup = ()=>{
    if (XPFNetwork._iCurr === undefined) return undefined;
    return XPFNetwork._gSem[XPFNetwork._iCurr];
};


// Caching helper functions
XPFNetwork._preloadBaseLayer = (i, onComplete)=>{
    if (XPFNetwork._txCache[i] !== undefined){
        return XPFNetwork._txCache[i];
    }

    let xpf = XPFNetwork._list[i];

    let pathbase = xpf._pathbaselayer;
    if (XPFNetwork._pathMod) pathbase = XPFNetwork._pathMod(pathbase);

    ATON.Utils.textureLoader.load(pathbase, (tex)=>{
        tex.encoding = THREE.sRGBEncoding;
        //tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = true;

        XPFNetwork._txCache[i] = tex;
        //console.log("Preloaded XPF "+i);

        if (onComplete) onComplete(tex);
    });
};

XPFNetwork._clearTexCache = ()=>{
    if (XPFNetwork._iCurr === undefined) return;

    for (let i in XPFNetwork._txCache){
        if (XPFNetwork._txCache[i] && i !== XPFNetwork._iCurr){
            XPFNetwork._txCache[i].dispose();
            XPFNetwork._txCache[i] = undefined;
        }
    }
};

// TODO:
XPFNetwork._setBaseLayerTexture = (xpf, tex)=>{
    XPFNetwork._mat.map = tex;
    XPFNetwork._mat.needsUpdate = true;

    XPFNetwork._mesh.position.copy( xpf.getLocation() );
    XPFNetwork._mesh.rotation.set( xpf.getRotation().x, xpf.getRotation().y, xpf.getRotation().z );
};

/**
Update current XPF base layer (texture)
@param {function} onComplete - (optional) routine to be called on completion
*/
XPFNetwork.updateCurrentXPFbaseLayer = ( onComplete )=>{
    if (XPFNetwork._iCurr === undefined) return;

    let xpf = XPFNetwork._list[XPFNetwork._iCurr];
    if (xpf === undefined) return;

    let pathbase = xpf._pathbaselayer;
    if (XPFNetwork._pathMod) pathbase = XPFNetwork._pathMod(pathbase);

    ATON.Utils.textureLoader.load(pathbase, (tex)=>{
        tex.encoding = THREE.sRGBEncoding;
        //tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = true;

        XPFNetwork._mat.map = tex;
        XPFNetwork._mat.needsUpdate = true;

        XPFNetwork._mesh.position.copy( xpf.getLocation() );
        XPFNetwork._mesh.rotation.set( xpf.getRotation().x, xpf.getRotation().y, xpf.getRotation().z );

        if (onComplete) onComplete(tex);
    });
};

XPFNetwork.setCurrentXPF = (i, onComplete)=>{
    //let xpf = XPFNetwork._list[i];
    //if (xpf === undefined) return;

    XPFNetwork._iCurr = i;
    XPFNetwork._iNext = undefined;
    
    XPFNetwork._mesh.visible = true;

    XPFNetwork._gSem[i].show();

    XPFNetwork.updateCurrentXPFbaseLayer( onComplete );
/*
    // hit
    if (XPFNetwork._txCache[i]){
        //console.log("hit");
        XPFNetwork._setBaseLayerTexture(xpf, XPFNetwork._txCache[i]);
        if (onComplete) onComplete();
        return;
    }

    // load tex
    XPFNetwork._preloadBaseLayer(i, (tex)=>{
        //console.log("miss");
        XPFNetwork._setBaseLayerTexture(xpf, tex);
        if (onComplete) onComplete();
    });
*/
};

/**
Get XPF by index
@param {number} i - XPF index
@returns {XPF}
*/
XPFNetwork.getXPFbyIndex = (i)=>{
    return XPFNetwork._list[i];
};

/**
Get current (active) XPF index
@returns {number}
*/
XPFNetwork.getCurrentXPFindex = ()=>{
    return XPFNetwork._iCurr;
};

/**
Get current (active) XPF
@returns {XPF}
*/
XPFNetwork.getCurrentXPF = ()=>{
    if (XPFNetwork._iCurr === undefined) return undefined;
    return XPFNetwork._list[XPFNetwork._iCurr];
};

/**
Get next XPF in sight index
@returns {number}
*/
XPFNetwork.getNextXPFindex = ()=>{
    return XPFNetwork._iNext;
};

/**
Get next XPF in sight
@returns {XPF}
*/
XPFNetwork.getNextXPF = ()=>{
    if (XPFNetwork._iNext === undefined) return undefined;
    return XPFNetwork._list[XPFNetwork._iNext];
};

/**
Utility to show locomotion SUI (if any) only for a given XPF
@param {number} i - XPF index
*/
XPFNetwork.showSUIonlyForXPF = (i)=>{
    let len = XPFNetwork._list.length;
    if (len<1) return;

    for (let k=0; k<len; k++){
        let LN = XPFNetwork._list[k]._lnode;
        if (LN){
            if (k == i) LN.toggleSUI(true);
            else LN.toggleSUI(false);
        }
    }
};

/**
Request a transition to a given XPF by index
@param {number} i - The XPF index
*/
XPFNetwork.requestTransitionByIndex = (i)=>{
    let xpf = XPFNetwork._list[i];
    if (xpf === undefined) return;

    let dur = XPFNetwork.STD_XPF_TRANSITION_DURATION;
    if (ATON.XR._bPresenting) dur = 0.0;

    ATON.Nav.requestTransitionToLocomotionNode( xpf.getLocomotionNode(), dur );

/*
    XPFNetwork.setCurrentXPF(i, ()=>{
        ATON.Nav.requestTransitionToLocomotionNode( xpf.getLocomotionNode(), dur );
    });
*/
};

/**
Set a given XPF location as home (Nav module)
@param {number} i - The XPF index
*/
XPFNetwork.setHomeXPF = (i)=>{
    let xpf = XPFNetwork._list[i];
    if (xpf === undefined) return;

    let lnode = xpf.getLocomotionNode();

    let POV = new ATON.POV()
        .setPosition(lnode.pos)
        .setTarget(
            lnode.pos.x,
            lnode.pos.y, 
            lnode.pos.z + 1.0
        )
        //.setFOV(ATON.Nav._currPOV.fov);

    //console.log(POV)
    ATON.Nav.setHomePOV(POV);
};

// TODO: Sphera, OPK
XPFNetwork.loadFromPhotoscanFile = (configfileurl, onComplete)=>{
    if (configfileurl === undefined) return;

    configfileurl = ATON.Utils.resolveCollectionURL(configfileurl);
    let basefolder = ATON.Utils.getBaseFolder(configfileurl);

    let numParsed = 0;

    $.ajax({
        url : configfileurl,
        dataType: "text",
        success : function(data){
            data = data.split(/\r\n|\n/);

            for (let i in data){
                let line = data[i];
                if ( !line.startsWith("#") ){
                    let fields = line.split(/\s{2,}|\t/);

                    if (fields.length > 10){ // should be = 16
                        let xpf = new ATON.XPF();

                        let baselayer = basefolder + fields[0];
                        let x = parseFloat(fields[1]);
                        let y = parseFloat(fields[2]);
                        let z = parseFloat(fields[3]);

                        // Omega,Phi,Kappa to radians
                        let o = ATON.DEG2RAD * parseFloat(fields[4]);
                        let p = ATON.DEG2RAD * parseFloat(fields[5]);
                        let k = ATON.DEG2RAD * parseFloat(fields[6]);

                        //console.log(o,p,k)

                        xpf.setLocation(x,z,-y); // from Z-up to Y-up
                        xpf.setBaseLayer(baselayer);
                        //xpf.setRotation(0, -(Math.PI * 0.5), 0);
                        xpf.setRotation(0, -o, 0);

                        XPFNetwork.add(xpf);
                        numParsed++;
                    }
                }
            }

            console.log("Num panoramas parsed: "+numParsed);

            if (onComplete) onComplete();
        }
    });
};

export default XPFNetwork;