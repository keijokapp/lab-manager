"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=_default;let cleanupHandler=null;const sigintHandler=signalHandler.bind(void 0,"SIGINT"),sighupHandler=signalHandler.bind(void 0,"SIGHUP"),sigquitHandler=signalHandler.bind(void 0,"SIGQUIT"),sigtermHandler=signalHandler.bind(void 0,"SIGTERM");function signalHandler(a){return uninstall(),cleanupHandler(a,()=>{process.kill(process.pid,a)}),!1}function exitHandler(a){uninstall(),cleanupHandler(a)}function install(){process.on("SIGINT",sigintHandler),process.on("SIGHUP",sighupHandler),process.on("SIGQUIT",sigquitHandler),process.on("SIGTERM",sigtermHandler),process.on("exit",exitHandler)}function uninstall(){process.removeListener("SIGINT",sigintHandler),process.removeListener("SIGHUP",sighupHandler),process.removeListener("SIGQUIT",sigquitHandler),process.removeListener("SIGTERM",sigtermHandler),process.removeListener("exit",exitHandler)}function _default(a){if("function"==typeof a){if(cleanupHandler)throw new Error("Cleanup handler has already been set");cleanupHandler=a,install()}else if(Number.isInteger(a)&&0<=a&&255>=a)uninstall(),cleanupHandler?cleanupHandler(a,()=>{process.exit(a)}):process.exit(a);else throw new Error("Bad exit code: "+a)}