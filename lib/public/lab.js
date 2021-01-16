import React from 'react';
import ReactDOM from 'react-dom';
import Labs from '../views/Labs.js';
import Lab from '../views/Lab.js';

const appContainer = document.querySelector('#app');

if ('labs' in window.INIT_STATE) {
	ReactDOM.render(<Labs labs={window.INIT_STATE.labs} />, appContainer);
} else if ('lab' in window.INIT_STATE) {
	ReactDOM.render(<Lab lab={window.INIT_STATE.lab} />, appContainer);
}
