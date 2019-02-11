"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.asyncMiddleware=asyncMiddleware,exports.getHost=getHost,exports.getPathPrefix=getPathPrefix,exports.getRootUrl=getRootUrl;function asyncMiddleware(a){return function(){const b=4===arguments.length?arguments[3]:arguments[2],c=4===arguments.length?arguments[2]:arguments[1];a.apply(this,[].slice.call(arguments,0,arguments.length-1)).then(()=>{c.finished||b()}).catch(a=>{c.finished||b(a)})}}function getHost(a){const b=a.app.get("trust proxy fn");let c=a.get("X-Forwarded-Host");return c&&b(a.connection.remoteAddress,0)||(c=a.get("Host")),c||(c="host-not-available"),c}function getPathPrefix(a){const b=a.app.get("trust proxy fn"),c=a.get("X-Forwarded-Path");return c&&b(a.connection.remoteAddress,0)?c.split(", ")[0]:""}function getRootUrl(a){let b=getPathPrefix(a);return b&&!b.startsWith("/")&&(b="/"+b),`${a.protocol}://${getHost(a)}${b}`}