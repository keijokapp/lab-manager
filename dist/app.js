"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var _path=_interopRequireDefault(require("path")),_express=_interopRequireDefault(require("express")),_browserifyMiddleware=_interopRequireDefault(require("browserify-middleware")),_expressWinston=_interopRequireDefault(require("express-winston")),_expressBearerToken=_interopRequireDefault(require("express-bearer-token")),_expressOpenapiMiddleware=require("express-openapi-middleware"),_swaggerUiExpress=_interopRequireDefault(require("swagger-ui-express")),_config=_interopRequireDefault(require("./config")),_common=require("./common"),_routes=_interopRequireDefault(require("./routes")),_iTeeCompat=require("./routes/i-tee-compat");function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}const babelify="production"===process.env.NODE_ENV?void 0:require("babelify"),app=(0,_express.default)();var _default=app;exports.default=_default,app.set("json spaces",2),app.set("trust proxy",!0),app.use(_common.reqid),_expressWinston.default.requestWhitelist.push("body"),app.use(_expressWinston.default.logger({winstonInstance:_common.logger}));const openapi={openapi:"3.0.0",servers:[{url:_config.default.appUrl}],tags:[{name:"Lab",description:"Labs"},{name:"Instance",description:"Running labs"},{name:"Machine",description:"VirtualBox machines"},{name:"Repository",description:"Git repositories"},{name:"I-Tee compatibility",description:"Limited I-Tee compatibility API"}],paths:{...(0,_expressOpenapiMiddleware.createPaths)(_routes.default),...(0,_expressOpenapiMiddleware.createPaths)(_iTeeCompat.routes)}};app.use("/docs/api",_swaggerUiExpress.default.serve,_swaggerUiExpress.default.setup(openapi));const externalModules=["react","react-dom","semantic-ui-react","table-dragger"];app.get("/bundle.js",(0,_browserifyMiddleware.default)(externalModules,{transform:babelify,paths:[__dirname+"/../node_modules"],external:externalModules.concat(["!!./../node_modules/css-loader/index.js!./main.css"])})),app.use("/bundle",(0,_browserifyMiddleware.default)(_path.default.join(__dirname,"public"),{transform:babelify,paths:[__dirname+"/../node_modules"],external:externalModules.concat(["!!./../node_modules/css-loader/index.js!./main.css"])})),app.use(_express.default.static(_path.default.dirname(require.resolve("semantic-ui-css")))),app.use(_express.default.json()),app.use((0,_expressBearerToken.default)()),app.use(_routes.default),app.use((a,b)=>{b.status(404).send({error:"Not Found",message:"Page not found"})}),app.use((a,b,c)=>{a instanceof _expressOpenapiMiddleware.OpenAPIValidationError?c.status(400).send({error:"Bad Request",errors:a.errors}):a instanceof Error?(_common.logger.error("Application error ",{e:a.message,stack:a.stack}),c.status(500).send({error:"Internal Server Error",message:"Something has gone wrong"})):(_common.logger.error("Unknown application error ",{e:a}),c.status(500).send())});