import React, { useState, useEffect } from 'react';
import { Icon } from 'semantic-ui-react';


function timeSince(msDiff) {
	const seconds = Math.round(msDiff / 1000);
	let interval = seconds / 31536000;
	let reminder = seconds % 31536000;
	if (interval >= 1) {
		return `${Math.floor(interval)} years ${Math.round(reminder / 86400)} months`;
	}
	interval = seconds / 2592000;
	reminder = seconds % 2592000;
	if (interval >= 1) {
		return `${Math.floor(interval)} months ${Math.round(reminder / 86400)} days`;
	}
	interval = seconds / 86400;
	reminder = seconds % 86400;
	if (interval >= 1) {
		return `${Math.floor(interval)} days ${Math.round(reminder / 3600)} hours`;
	}
	interval = seconds / 3600;
	reminder = seconds % 3600;
	if (interval >= 1) {
		return `${Math.floor(interval)} hours ${Math.round(reminder / 60)} minutes`;
	}
	interval = seconds / 60;
	reminder = seconds % 60;
	if (interval >= 1) {
		return `${Math.floor(interval)} minutes ${reminder} seconds`;
	}
	return `${seconds} seconds`;
}


export function TimeSince({ date }) {
	const [diff, setDiff] = useState(new Date() - date);

	useEffect(() => {
		const timeout = setTimeout(() => { setDiff(new Date() - date); }, 6000);
		return () => { clearTimeout(timeout); };
	});

	return <>{timeSince(diff)}</>;
}


export function SecretKey({ children, as, ...c }) {
	const [visible, setVisible] = useState(false);
	const child = React.createElement(typeof as !== 'undefined' ? as : 'span', c, visible ? children : 'XXX');
	return (
		<span>
			{child}
			<Icon
				link
				name={visible ? 'eye slash' : 'eye'}
				style={{ margin: '0 0 0 .5em' }}
				onClick={() => { setVisible(!visible); }}
			/>
		</span>
	);
}
