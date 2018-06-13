import React from 'react';
import ReactDOM from 'react-dom';
import Repositories from '../views/Repositories';

const appContainer = document.querySelector('#app');

ReactDOM.render(<Repositories repositories={window.INIT_STATE.repositories}/>, appContainer);
