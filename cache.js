var app_cache = function() {
	'use_strict';

	const touchable = ('ontouchstart' in window);
	
	let confirm_cb = null;
	
	if(touchable) {
		const btns = _$$('.app_confirm_pnl a');
		btns.forEach((btn, i) => {
			btn.addEventListener('click', (evt) => {
				_$('.app_confirm_pnl').classList.remove('app_confirm_pnl_vis');
				confirm_cb(i == 0 ? 'ok' : 'close');
				confirm_cb = null;
			})
		});
		window.addEventListener('click', (evt) => {
			if(confirm_cb != null) {
				_$('.app_confirm_pnl').classList.remove('app_confirm_pnl_vis');
				confirm_cb('ignore');
				confirm_cb = null;
			}
		});
	}
	
	function show_confirm(msg, img = null) {
		return new Promise((resolve, reject) => {
			_$('.app_confirm_pnl .txt_btn').innerHTML = msg;
			if(img)
				_$('.app_confirm_pnl img').src = img;
			_$('.app_confirm_pnl').classList.add('app_confirm_pnl_vis');
			
			confirm_cb = resolve;
		});
	}

	if(touchable && 'serviceWorker' in navigator && navigator.userAgent.indexOf('Edge') == -1) {
		navigator.serviceWorker
			 .register('worker.js.php')
			 .then(function(reg) {
				navigator.serviceWorker.addEventListener('message', on_message);
			});
	}
  
	function format_size(s) {
		if(s < 1024)
			return s + ' b';
		if(s < 1024 * 1024)
			return (s / 1024).toFixed(1) + ' kb';
		return (s / 1024 / 1024).toFixed(1) + ' Mb';
	}

	function on_message(evt) {
		if(evt.data.type == 'update_available') {
			(async function() {
				let res = 'ok';
				if(homescreen_mode)
					res = await show_confirm(`Install new update? (${format_size(evt.data.size)})`);
				evt.source.postMessage({type : res == 'ok' ? 'load_update' : 'discard_update'});
			})();
		}
		if(evt.data.type == 'update_loaded') {
			(async function() {
				let res = 'close';
				if(homescreen_mode)
					res = await show_confirm('Apply update?');
				evt.source.postMessage({type : res == 'ok' ? 'apply_update' : 'no_apply_update'});
			})();
		}
		if(evt.data.type == 'update_applied') {
			location.reload();
		}
	}
	
	let homeprompt = null;
	
	if(touchable)
		window.addEventListener('beforeinstallprompt', evt => {
			evt.preventDefault();
			homeprompt =  evt;
			_$('.add2home_btn').style.visibility = 'inherit';
			if(localStorage.getItem('homeprompt') != 'close') {
				(async function() {
					const res = await show_confirm('Add this App to Homescreen', 'images/chstove_96.png');
					if(res == 'ok')
						add2home();
					else if(res == 'close')
						localStorage.setItem('homeprompt', 'close');
				})();
			}
		});
	
	function add2home() {
		homeprompt.prompt();
	}
	
	return {add2home: add2home};
}