'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

exports.default = function (title, state, html) {
	return `<html>
	<head>
		<meta charset="utf-8"/>
		<title>${title}</title>
		<base href="${_config2.default.appUrl + '/'}"/>
		<link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"/>
		<link rel="stylesheet" href="semantic.min.css"/>
		<script src="bundle.js"></script>
		<script>
			window.config = ${JSON.stringify(browserConfig)};
			window.INIT_STATE = ${JSON.stringify(state)};
		</script>
	</head>
	<body>
	<div class="ui sidebar menu left vertical visible inverted">
		${menu}
	</div>
	<div id="app" style="width: calc(100% - 260px); margin-left: 260px; padding: 3em 3em 0 3em">
		${html}
	</div>
	</body>
	</html>`;
};

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const browserConfig = {};

if ('remote' in _config2.default) {
	browserConfig.remote = _config2.default.remote;
}

if ('virtualbox' in _config2.default) {
	browserConfig.virtualbox = true;
}

if ('repositories' in _config2.default) {
	browserConfig.repositories = true;
}

let menu = [["lab", "Labs"], ["instance", 'Running labs']];

if ('virtualbox' in _config2.default) {
	menu.push(['machine', 'Virtual machines']);
	menu.push(['machine?template', 'Templates']);
}

if ('repositories' in _config2.default) {
	menu.push(['repository', 'Repositories']);
}

menu = menu.map(m => `<a class="item" href="${m[0]}">${m[1]}</a>`).join('');

/**
 * Returns HTML string representing main layout
 * WARNING: All arguments must come from *trusted* as they are not escaped or checked
 * @param title {string} Title
 * @param state {object} state
 * @param html {string} additional HTML
 * @returns {string}
 */
;