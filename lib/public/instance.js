import React from 'react';
import ReactDOM from 'react-dom';
import Instance from '../views/Instance.js';
import Instances from '../views/Instances.js';

const appContainer = document.querySelector('#app');

if ('instances' in window.INIT_STATE) {
	ReactDOM.render(<Instances instances={window.INIT_STATE.instances} />, appContainer);
} else if ('instance' in window.INIT_STATE) {
	ReactDOM.render(<Instance instance={window.INIT_STATE.instance} />, appContainer);
}
