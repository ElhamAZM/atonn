/*!
    @preserve

 	ATON Main Service

 	@author Bruno Fanini
	VHLab, CNR ISPC

==================================================================================*/

const fs          = require('fs');
const express     = require('express');
const http        = require('http');
const https       = require('https');
const url         = require('url');
//const compression = require('compression');
const path        = require('path');
const cors        = require('cors');

const glob   = require("glob");
const nanoid = require("nanoid");
const { createProxyMiddleware } = require('http-proxy-middleware');

const Core = require('./Core');

// Initialize & load config files
Core.init();


const PORT            = process.env.PORT || Core.config.services.main.PORT || 8080;
const PORT_SECURE     = Core.config.services.main.PORT_S || 8083;
//const PORT_ATONIZER   = Core.config.services.atonizer.PORT || 8085;
const PORT_VRC        = Core.config.services.vroadcast.PORT || 8890;

let PORT_WEBDAV = 8081;
if (Core.config.services.webdav && Core.config.services.webdav.PORT) PORT_WEBDAV = Core.config.services.webdav.PORT;

const pathCert = Core.getCertPath();
const pathKey  = Core.getKeyPath();

let bExamples = Core.config.services.main.examples;
//let bAPIdoc   = Core.config.services.main.apidoc;

// Debug on req received (client)
let logger = function(req, res, next){
    console.log('Request from: ' + req.ip + ' For: ' + req.path);
    next(); // Run the next handler
};


let app = express();

//app.set('trust proxy', 1); 	// trust first proxy

//app.use(compression());
app.use(cors({credentials: true, origin: true}));

/*
    app.use((req, res, next)=>{
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
*/

app.use(express.json({ limit: '50mb' }));

// Scenes redirect /s/<sid>
app.get(/^\/s\/(.*)$/, function(req,res,next){
	let sid = req.params[0];

	//req.url     = "/fe";
	//req.query.s = sid;
	
	res.redirect(url.format({
		pathname:"/fe",
		query: { "s": sid }
	}));

	next();
});

// Data routing (advanced)
//Core.setupDataRoute(app);


app.use('/', express.static(Core.DIR_PUBLIC, /* { maxAge: 31557600 } */));
app.use('/mods', express.static(Core.DIR_NODE_MODULES, /*{ maxAge: 31557600 }*/));

// Official front-end (Hathor)
app.use('/fe', express.static(Core.DIR_FE));

// Web-apps
app.use('/a', express.static(Core.DIR_WAPPS));

// Data (static)
app.use('/', express.static(Core.DIR_DATA));


Core.setupPassport();
Core.realizeAuth(app);

// REST API
Core.realizeBaseAPI(app);

// Micro-services proxies
//=================================================
/*
// Atonizer
app.use('/atonizer', createProxyMiddleware({ 
	target: Core.config.services.atonizer.address+":"+PORT_ATONIZER, 
	pathRewrite: { '^/atonizer': ''},
	//changeOrigin: true 
}));
*/

// VRoadcast
app.use('/vrc', createProxyMiddleware({ 
	target: Core.config.services.vroadcast.address+":"+PORT_VRC, 
	ws: true, 
	pathRewrite: { '^/vrc': ''},
	changeOrigin: true
}));
app.use('/svrc', createProxyMiddleware({ 
	target: Core.config.services.vroadcast.address+":"+PORT_VRC, 
	ws: true, 
	pathRewrite: { '^/svrc': ''},
	secure: true,
	changeOrigin: true 
}));

// WebDav
/*
app.use('/dav', createProxyMiddleware({ 
	//target: Core.config.services.webdav.address+":"+PORT_WEBDAV, 
	target: "http://localhost:"+PORT_WEBDAV,
	pathRewrite: { '^/dav': ''},
	changeOrigin: true
	//router: { "/dav" : "http://localhost:"+PORT_WEBDAV }
}));
*/

// START
//==================================

//let bSSL = false;

http.createServer(app).listen(PORT, ()=>{ 
	console.log('ATON main service running on :' + PORT);
});
    

// HTTPS service
if (fs.existsSync(pathCert) && fs.existsSync(pathKey)){
	let httpsOptions = {
		key: fs.readFileSync(pathKey, 'utf8'),
		cert: fs.readFileSync(pathCert, 'utf8')
		};

        //bSSL = true;

	https.createServer(httpsOptions, app).listen(PORT_SECURE, ()=>{ 
		console.log('HTTPS ATON main service running on :' + PORT_SECURE);
		});
	}
else {
	//bSSL = false;
	console.log("SSL certs not found: "+pathKey+", "+pathCert);
}