/*
    ATON Light Probe Class

    author: bruno.fanini_AT_gmail.com

===========================================================*/

/**
Class representing a light probe (LP), can be static or updated at runtime
@class LightProbe
@param {number} res - Resolution in pixel of lightprobe (default 64)
@param {number} near - Capture near (default 1m)
@param {number} far - Capture far (default 1Km)
@example 
let LP = new ATON.LightProbe()
*/
class LightProbe {

constructor(res, near, far){
    this.pos = new THREE.Vector3(0,0,0);

    this._res  = (res !== undefined)?  res  : 64;
    this._near = (near !== undefined)? near : 1.0;
    this._far  = (far !== undefined)?  far  : ATON.Nav.STD_FAR;
/*
    this._LPtarget0 = undefined;
    this._LPtarget1 = undefined;

    this._LP0 = undefined;
    this._LP1 = undefined;

    this._flipLP = false;
*/
    this._envtex = undefined;
    this._prevCCtarget = undefined;
    this._CC = undefined;
/*
    this._LP = new THREE.LightProbe();
    this._LP.intensity = 10;
    ATON._mainRoot.add( this._LP );
*/
/*
    this._pmremGenerator = new THREE.PMREMGenerator(ATON._renderer);
    this._pmremGenerator.compileCubemapShader();
*/
    //this.realize();
}

/*
realize(){
    this._LPtarget0 = new THREE.WebGLCubeRenderTarget( this._res, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        encoding: THREE.sRGBEncoding // prevent the material's shader from recompiling every frame
    });

    this._LPtarget1 = new THREE.WebGLCubeRenderTarget( this._res, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        encoding: THREE.sRGBEncoding
    });

    this._LP0 = new THREE.CubeCamera( this._near, this._far, this._LPtarget0 );
    this._LP1 = new THREE.CubeCamera( this._near, this._far, this._LPtarget1 );

    return this;
}
*/

/**
Set LP position
@example
LP.setPosition(2.0,6.0,1.5)
@example
LP.setPosition( new THREE.Vector3(2.0,6.0,1.5) )
*/
setPosition(x,y,z){
    if (x instanceof THREE.Vector3) this.pos.copy(x);
    else this.pos.set(x,y,z);

    //this._LP.position.copy(this.pos);

    return this;
}

setNear(near){
    this._near = near;
    return this;
}
setFar(far){ 
    this._far = far;
    return this;
}

_createCCtarget(){
    if (this._CCtarget) this._CCtarget.dispose();

    this._CCtarget = new THREE.WebGLCubeRenderTarget( this._res, {
        format: THREE.RGBEFormat, //THREE.RGBEFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        encoding: THREE.sRGBEncoding // prevent the material's shader from recompiling every frame
    });
}

/**
Update LP capture. Typically called when all 3D models are loaded and arranged into the scene.
Can be called at runtime or whenever there is some change in the 3D scene
@example
LP.update()
*/
update(){
    if (this._envtex) this._envtex.dispose();
    //if (this._prevCCtarget) this._prevCCtarget.dispose();
/*
    const CCtarget = new THREE.WebGLCubeRenderTarget( this._res, {
        format: THREE.RGBFormat, //THREE.RGBEFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        encoding: THREE.sRGBEncoding // prevent the material's shader from recompiling every frame
    });
    //CCtarget.texture.mapping = THREE.CubeRefractionMapping;

    let CC = new THREE.CubeCamera( this._near, this._far, CCtarget );
*/

    if (this._CC === undefined){
        this._createCCtarget();

        //console.log(this._CCtarget)

        //this._CCtarget.texture.mapping = THREE.CubeUVRefractionMapping;
        //this._CCtarget.texture.flipY = true;
        //this._CCtarget.texture.needsUpdate = true;

        this._CC = new THREE.CubeCamera( this._near, this._far, this._CCtarget );

        //this._pmremGenerator = new THREE.PMREMGenerator(ATON._renderer);
    }


    //CC.matrixAutoUpdate = false;
    //this._CC.position.copy(this.pos);
    this._CC.position.set(-this.pos.x, this.pos.y, this.pos.z);

    //this._CC.rotation.y = Math.PI;
    //this._CC.rotation.x = Math.PI;
    //this._CC.rotation.z = -Math.PI;
    //this._CC.scale.set(-1,1,1);
    //CC.layers.set(ATON.NTYPES.SCENE);

/*
    //CC.children = CC.children.reverse();
    for (let ccam in this._CC.children){
        //this._CC.children[ccam].rotation.y = Math.PI;
        if (ccam % 2 === 1) this._CC.children[ccam].scale.x = -1;
        //this._CC.children[ccam].up.y = 1.0;
        //console.log(this._CC.children[ccam].rotation)
    }
*/
    //console.log(this._CC)

    ATON._mainRoot.scale.x = -1;
    this._CC.update( ATON._renderer, ATON._mainRoot );
    ATON._mainRoot.scale.x = 1;

    ATON._dMainL.shadow.needsUpdate = true;

    //this._CC.update( ATON._renderer, ATON._mainRoot);
    
    //this._envtex = this._CCtarget.texture;
    //return this;

    let cctx = this._CCtarget.texture;
    //cctx.flipY = false;
    //cctx.needsUpdate = true;
    //console.log(cctx)

    //ATON._rootVisibleGlobal.position.set(-this.pos.x,-this.pos.y,-this.pos.z);
    //this._envtex = this._pmremGenerator.fromScene(ATON._rootVisibleGlobal, 0, this._near, this._far).texture;
    
    this._envtex = ATON._pmremGenerator.fromCubemap(cctx).texture;

    //this._envtex.rotation = Math.PI;
    //console.log(this._pmremGenerator)

    //console.log(CCtarget)

    // new
    //this._LP.copy( THREE.LightProbeGenerator.fromCubeRenderTarget(ATON._renderer, CCtarget) );
    //this._envtex = this._LP;
    
    
/*
    console.log(CC);
    console.log(CCtarget);

    let CCtargetX = new THREE.WebGLCubeRenderTarget( this._res, {
        format: THREE.RGBFormat,
        //generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        encoding: THREE.sRGBEncoding
    });

    let CCX = new THREE.CubeCamera( this._near, this._far, CCtargetX );
    CCX.position.copy(this.pos);

    CCX.update( ATON._renderer, ATON._rootVisible );
    this._envtex = this._pmremGenerator.fromCubemap(CCtargetX.texture).texture;
*/

    //this._prevCCtarget = CCtarget;

    return this;
}


getEnvTex(){
    return this._envtex;
}

assignToNode(N){
    if (N === undefined) return;
    //TODO:
}

}

export default LightProbe;