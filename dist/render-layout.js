"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _config = _interopRequireDefault(require("./config"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const browserConfig = {};

if ('remote' in _config.default) {
  browserConfig.remote = _config.default.remote;
}

if ('virtualbox' in _config.default) {
  browserConfig.virtualbox = true;
}

if ('repositories' in _config.default) {
  browserConfig.repositories = true;
}

let menu = [['lab', 'Labs'], ['instance', 'Running labs']];

if ('virtualbox' in _config.default) {
  menu.push(['machine', 'Virtual machines']);
  menu.push(['machine?templates', 'Templates']);
}

if ('repositories' in _config.default) {
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

function _default(title, state, html) {
  return `<html>
	<head>
		<meta charset="utf-8"/>
		<title>${title}</title>
		<base href="${`${_config.default.appUrl}/`}"/>
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
}