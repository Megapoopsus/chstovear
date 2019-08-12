<?
header('Content-type: application/javascript');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

require('worker_list.php');
require('_version.php');
?>
'use strict';

const debugging = false;

const app_keys = [
	{name : 'shell', ver : '<?=$version[0]?>', size : <?=$caches['shell']['size']?>},
	{name : 'model', ver : '<?=$version[1]?>', size : <?=$caches['model']['size']?>}
]

let app_files;

var msg_resolve, msg_reject;
let t_id = 0;

function msg2client(msg, client) {
	return new Promise(function(resolve, reject) {
		msg_resolve = resolve;
		msg_reject = reject;
		client.postMessage(msg);
		t_id = setTimeout(() => msg_resolve({type : 'timeout'}), 60000);
	});
}

self.addEventListener('install', function(e) {
	console.log('[ServiceWorker] Installing');
	e.waitUntil(async function() {
		let update_loaded = false;
			console.log('a0');
//		if(registration.active) { Не работает в FF_
		if(true) {
			console.log('a1');
			
			const keys = await caches.keys();
			const size = app_keys.reduce((s, k) => {
				if(!keys.includes(k.ver))
					return s + k.size;
				return s;
			}, 0);
			
			console.log('a2');
			if(size > 0) {
			console.log('a3');
				app_files = await (await fetch('worker_list.php?from_sw')).json();
				update_loaded = true;
				
				const cs = (await clients.matchAll({includeUncontrolled: true})).filter((c) => c.url.match(/((\/)|(\/index.php))(\?.+?)?$/));
				const cl = cs.length > 1 ? cs.find((c) => c.focused) : cs[0];
			console.log('a4');
				if(cl) {
			console.log('a5');
					const r = (await msg2client({type : 'update_available', size : size}, cl));
					if(r.type == 'discard_update') {
						console.log('[ServiceWorker] Discarding update');
						throw new Error('discard_update');
					}
				}
			}
		} else {
			console.log('a6');
			app_files = await (await fetch('worker_list.php?from_sw')).json();
		}
			console.log('a7');
		await cache_files();
			console.log('a8');
		if(update_loaded) {
			(async function() {
				const cs = (await clients.matchAll({includeUncontrolled: true})).filter((c) => c.url.match(/((\/)|(\/index.php))(\?.+?)?$/));
				const cl = cs.length > 1 ? cs.find((c) => c.focused) : cs[0];
				if(cl) {
					const r = (await msg2client({type : 'update_loaded'}, cl));
					if(r.type != 'no_apply_update') {
						console.log('[ServiceWorker] Applying update');
						await skipWaiting();
						msg2client({type : 'update_applied'}, cl);
					}
				} else {
					console.log('[ServiceWorker] Applying update');
					await skipWaiting();
				}
			})();
		}
		console.log('[ServiceWorker] Installed');
	}()
	);
})

async function cache_files() {
	let keys = await caches.keys();
	const kk = app_keys.filter((k) => !keys.includes(k.ver));
	
	return Promise.all(kk.map(async (k) => {
		console.log('[ServiceWorker] Caching ', k.ver);
		let c = await caches.open(k.ver);
		return Promise.all(app_files[k.name].files.map(async (f) => {
			const r = await fetch(f, {cache : 'no-cache'});
			if (!r.ok) {
				throw new TypeError('Bad response status on ' + f);
			}
			return c.put(f, r);
		}));
	}));
}

self.addEventListener('activate', function(e) {
	console.log('[ServiceWorker] Activate');
	
	e.waitUntil(async function() {
		let keys = await caches.keys();
		return Promise.all(keys.map((key) => {
			if(!app_keys.find((k) => k.ver == key))
				return caches.delete(key);
		}))
	}()
	
	);
	return self.clients.claim();
});

let homescreen_clients = [];

self.addEventListener('fetch', function(e) {
	if(debugging) {
		e.respondWith(fetch(e.request));
		return;
	}
//	console.log('cl_id', e.clientId, e.replacesClientId, e.resultingClientId, e.request.url);
	
/*
В большинстве случаев надо посмотреть на referrer. Если в нем присутствует параметр 
homescreen, то загружаем из кэша.
Если картинка запрашивается из css, то приходится проверять clientId. Если такой clientId
есть в списке homescreen_clients, то значит этот css загружался с homescreen.
Также бывают js-файлы, которые запрашиваются из svg. Для этого запоминаем еще и
resultingClientId для svg.
*/
	
	const ref = e.request.referrer.length > 0 ? e.request.referrer : e.request.url;
	if(!(new URL(ref)).searchParams.has('homescreen') && !homescreen_clients.includes(e.clientId)) {
		console.log('[ServiceWorker] from_site', e.request.url);
		e.respondWith(fetch(e.request));
		return;
	}
	//Значит запрос идет с homescreen
	//Запоминаем на будущее этот clientId и resultingClientId
	if(e.clientId.length > 0 && !homescreen_clients.includes(e.clientId))
		homescreen_clients.push(e.clientId);
	if(e.resultingClientId.length > 0 && !homescreen_clients.includes(e.resultingClientId))
		homescreen_clients.push(e.resultingClientId);
	
	console.log('[ServiceWorker] from_cache', e.request.url);

	//А может возвратиться новый уже загруженный файл до собственно согласия на апдейт?
	if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;
	//Если применять {'ignoreSearch' : true}, то Хром тормозит. Это его баг, поэтому просто отрезаю search сам
	let url = e.request.url.replace(/\?.*$/, '');
	const base_url = self.location.href.replace(/[^\/]+$/, '');
	if(url == base_url) url += 'index.php';
	e.respondWith(
	  caches.match(url).then(function(response) {
		return response || fetch(e.request);
	  })
	);
});

self.addEventListener('message', (evt) => {
	clearTimeout(t_id);
	msg_resolve(evt.data);
});

/*
1. 
2. 
3. 

*/
