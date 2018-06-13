import React from 'react';
import { Icon } from 'semantic-ui-react';


function timeSince(date) {
	const seconds = Math.floor((new Date() - date) / 1000);
	let interval = Math.floor(seconds / 31536000);
	let reminder = seconds % 31536000;
	if(interval > 1) {
		return interval + ' years ' + Math.floor(reminder / 86400) + ' months';
	}
	interval = Math.floor(seconds / 2592000);
	reminder = seconds % 2592000;
	if(interval > 1) {
		return interval + ' months ' + Math.floor(reminder / 86400) + ' days';
	}
	interval = Math.floor(seconds / 86400);
	reminder = seconds % 86400;
	if(interval > 1) {
		return interval + ' days ' + Math.floor(reminder / 3600) + ' hours';
	}
	interval = Math.floor(seconds / 3600);
	reminder = seconds % 3600;
	if(interval > 1) {
		return interval + ' hours ' + Math.floor(reminder / 60) + ' minutes';
	}
	interval = Math.floor(seconds / 60);
	reminder = seconds % 60;
	if(interval > 1) {
		return interval + ' minutes ' + reminder + ' seconds';
	}
	return Math.floor(seconds) + ' seconds';
}


export class TimeSince extends React.Component {
	render() {
		const t = timeSince(this.props.date);
		setTimeout(() => {
			this.forceUpdate();
		}, 6000);
		return t;
	}
}


export class SecretKey extends React.Component {
	constructor() {
		super();
		this.state = {};
	}

	render() {
		const c = { ...this.props };
		delete c.as;
		delete c.children;
		const child = React.createElement('as' in this.props ? this.props.as : 'span', c, this.state.visible ? this.props.children : 'XXX');
		return <span>{child} <Icon name={this.state.visible ? 'eye slash' : 'eye'} onClick={() => {
			this.setState({ visible: !this.state.visible });
		}} link/></span>;
	}
}
