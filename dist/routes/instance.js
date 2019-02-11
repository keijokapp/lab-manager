"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var _nodeFetch=_interopRequireDefault(require("node-fetch")),_express=require("express"),_expressOpenapiMiddleware=require("express-openapi-middleware"),_config=_interopRequireDefault(require("../config")),_common=require("../common"),_renderLayout=_interopRequireDefault(require("../render-layout")),_util=require("../util"),_createInstance=_interopRequireDefault(require("../create-instance")),_instanceSubroutes=_interopRequireDefault(require("./instance-subroutes"));function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}const routes=new _express.Router;var _default=routes;exports.default=_default,routes.get("/",(0,_expressOpenapiMiddleware.apiOperation)({tags:["Instance"],summary:"List instances",responses:{200:{description:"List of instances"}}}),(0,_util.asyncMiddleware)(async(a,b)=>{if(!(0,_common.authorize)(a.token))return void b.status(403).send({error:"Permission Denied",message:"Client is not authorized"});const c=await _common.db.allDocs({startkey:"instance/",endkey:"instance/\uFFFF",include_docs:!0}),d=c.rows.map(a=>(a.doc._id=a.doc._id.slice(9),a.doc));await syncITee(d),b.format({html:function(){b.send((0,_renderLayout.default)((0,_util.getPathPrefix)(a),"Lab instances",{instances:d},"<script src=\"bundle/instance.js\"></script>"))},json:function(){b.send(d)}})}));async function syncITee(a){if(!("iTee"in _config.default)||!("key"in _config.default.iTee))return;let b;try{const a=await(0,_nodeFetch.default)(_config.default.iTee.url+"/lab_users.json?condition[end]=null&auth_token="+encodeURIComponent(_config.default.iTee.key),{headers:{"x-request-id":(0,_common.reqid)()}});a.ok?b=await a.json():_common.logger.error("Failed to fetch instances from I-Tee",{response:await a.text()})}catch(a){_common.logger.error("Failed to fetch instances from I-Tee",{e:a.message})}if(!b)return;const c={};for(const d of b)d.start&&!d.end&&(c[d.uuid]=d);const d=[];let e=0,f=0;for(const b in a){const f=a[b];f.imported&&!(f.privateToken in c)?(d.push((0,_common.deleteInstance)(f).catch(a=>{_common.logger.log({level:"conflict"===a.name?"warn":"error",message:"Failed to delete imported instance",e:a.message})})),a.splice(b,1),e++,delete c[f.privateToken]):f.privateToken in c&&delete c[f.privateToken]}for(const b in c)d.push(importInstanceFromITee(b).then(c=>{if(c instanceof Object&&"_id"in c){let b;for(b=0;b<a.length;b++)if(-1<a[b]._id.localeCompare(c._id)){a.splice(b,0,c);break}b===a.length&&a.push(c),f++}else _common.logger.warn("Failed to import lab",{privateToken:b,e:c})}));await Promise.all(d),(f||e)&&_common.logger.debug("Synced instances with I-Tee",{importedInstances:f,deletedInstances:e})}async function importInstanceFromITee(a){const b=await(0,_common.iTeeLabinfo)(a);if(!(b instanceof Object))return b;let c;try{c=await _common.db.get("lab/"+b.lab.name)}catch(a){if("not_found"===a.name)return["Lab does not exist"];throw a}c._id=c._id.slice(4);const d=[],e={_id:b.lab.name+":"+b.user.username,username:b.user.username,imported:!0,startTime:b.labuser.start,iTeeCompat:{instanceId:b.id,labId:b.lab.id,userId:b.user.id},lab:c,publicToken:b.labuser.token,privateToken:b.labuser.uuid};if("labProxy"in _config.default&&(e.labProxy=_config.default.labProxy),"assistant"in c&&(b.assistant.uri!==c.assistant.url&&d.push("Assistant URL-s do not match"),b.lab.lab_hash!==c.assistant.lab&&d.push("Assistant lab ID-s do not match"),b.lab.lab_token!==c.assistant.key&&d.push("Assistant access keys do match"),"string"!=typeof b.user.user_key||1>b.user.user_key.length?d.push("Invalid user key"):e.assistant={userKey:b.user.user_key,link:b.assistant.uri+"/lab/"+encodeURIComponent(b.lab.lab_hash)+"/"+encodeURIComponent(b.user.user_key)}),"machines"in c)if(b.vms.sort((a,b)=>a.lab_vmt.position-b.lab_vmt.position),b.vms.length!==c.machineOrder.length)d.push("Machine counts do not match");else{e.machines={};for(let a=0;a<b.vms.length;a++){const f=b.vms[a],g=c.machines[c.machineOrder[a]];"virtualbox"!==g.type&&d.push("Machine is not VirtualBox machine"),g.base!==f.lab_vmt.vmt.image&&d.push("Machine base images do not match"),g.description!==f.lab_vmt.nickname&&d.push("Machine descriptions do not match"),e.machines[c.machineOrder[a]]={name:f.name,networks:[]}}}return d.length?d:(0,_createInstance.default)(e)}routes.use("/:token",(0,_expressOpenapiMiddleware.apiOperation)({parameters:[{in:"path",name:"token",description:"Public or private token of instance",required:!0,schema:{type:"string",minLength:1}}]}),(0,_util.asyncMiddleware)(async(a,b)=>{const c=await _common.db.query("instance/uuid",{key:a.params.token,include_docs:!0});if(0===c.rows.length&&"iTee"in _config.default){_common.logger.debug("Trying to import lab instance from I-Tee",{privateToken:a.params.token});const c=await importInstanceFromITee(a.params.token);c instanceof Object&&("string"==typeof c&&"Instance already exists"!==c?b.status(500).send({error:"Internal Server Error",message:"Failed to import lab instance from I-Tee",errors:c}):"instance already exists"!==c&&"_id"in c?(a.instance=c,a.instanceToken=a.params.token,a.instanceImported=!0):b.status(409).send({error:"Conflict",message:"Failed to import lab instance from I-Tee",errors:c}))}else 1===c.rows.length&&(a.instance=c.rows[0].doc,a.instance._id=a.instance._id.slice(9),a.instanceToken=a.params.token)})),routes.use("/:token",_instanceSubroutes.default);