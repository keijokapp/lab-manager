import config from './config';

const browserConfig = {};

if ('remote' in config) {
	browserConfig.remote = config.remote;
}

if ('virtualbox' in config) {
	browserConfig.virtualbox = true;
}

if ('repositories' in config) {
	browserConfig.repositories = true;
}

let menu = [
	['lab', 'Labs'],
	['instance', 'Running labs']
];

if ('virtualbox' in config) {
	menu.push(['machine', 'Virtual machines']);
	menu.push(['machine?templates', 'Templates']);
}

if ('repositories' in config) {
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
export default function (title, state, html) {
	return `<html>
	<head>
		<meta charset="utf-8"/>
		<title>${title}</title>
		<base href="${`${config.appUrl}/`}"/>
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
