import React from 'react';
import ReactDOM from 'react-dom';
import Machines from '../views/Machines';

const appContainer = document.querySelector('#app');

ReactDOM.render(<Machines machines={window.INIT_STATE.machines}
                          activeTab={window.INIT_STATE.activeTab}/>, appContainer);
