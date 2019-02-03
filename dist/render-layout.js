"use strict";var _config=_interopRequireDefault(require("./config"));Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=_default;function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}const browserConfig={};"remote"in _config.default&&(browserConfig.remote=_config.default.remote),"virtualbox"in _config.default&&(browserConfig.virtualbox=!0),"repositories"in _config.default&&(browserConfig.repositories=!0);let menu=[["lab","Labs"],["instance","Running labs"]];"virtualbox"in _config.default&&(menu.push(["machine","Virtual machines"]),menu.push(["machine?templates","Templates"])),"repositories"in _config.default&&menu.push(["repository","Repositories"]),menu=menu.map(a=>`<a class="item" href="${a[0]}">${a[1]}</a>`).join("");function _default(a,b,c){return`<html>
	<head>
		<meta charset="utf-8"/>
		<title>${a}</title>
		<base href="${_config.default.appUrl+"/"}"/>
		<link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"/>
		<link rel="stylesheet" href="semantic.min.css"/>
		<script src="bundle.js"></script>
		<script>
			window.config = ${JSON.stringify(browserConfig)};
			window.INIT_STATE = ${JSON.stringify(b)};
		</script>
	</head>
	<body>
	<div class="ui sidebar menu left vertical visible inverted">
		${menu}
	</div>
	<div id="app" style="width: calc(100% - 260px); margin-left: 260px; padding: 3em 3em 0 3em">
		${c}
	</div>
	</body>
	</html>`}