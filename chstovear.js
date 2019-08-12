"use strict"

//if(/debug_mode=true/.test(document.cookie)) (async () => window.debug_m = await import('/debug_m/debug_m.js'))();

const _$ = (q) => document.querySelector(q);
const _$$ = (q) => document.querySelectorAll(q);
const has_url_param = (p) => (new URLSearchParams(location.search)).has(p);

let homescreen_mode = false;

// register the application module
b4w.register("chstovear_main", function(exports, require) {

// import modules used by the app
var m_app       = require("app");
var m_cfg       = require("config");
var m_data      = require("data");
var m_preloader = require("preloader");
var m_ver       = require("version");
var m_cont      = require("container");
var m_cam       = require("camera");
var m_scs   	= require("scenes");
var m_main   	= require("main");
var m_tsr		= require("tsr");
var m_trans		= require("transform");
var m_vec3		= require("vec3");
var m_mat4		= require("mat4");
var m_ctl   	= require("controls");
var m_anim  	= require("animation");
var m_material  = require("material");

// detect application mode
//let DEBUG = (m_ver.type() == "DEBUG");
//let DEBUG = true;
let DEBUG = true;
const DEBUG_VIDEO = has_url_param('debug_video');

// automatically detect assets path
//let APP_ASSETS_PATH = m_cfg.get_assets_path("chstovear");
let APP_ASSETS_PATH = 'assets/';

function log(...args) {
	if(DEBUG)
		console.log(...args);
}

const _mat44_tmp = new Float32Array(16);
const _mat44_tmp2 = new Float32Array(16);
const _tsr_tmp = m_tsr.create();
const _vec3_tmp = m_vec3.create();
const _vec3_tmp2 = m_vec3.create();


//const VIEW_FACTOR = 1.2;
const VIEW_FACTOR = 2;

let ar_contr = null;
let ar_contr_land = null;
let ar_contr_por = null;
let ar_param_land = null;
let ar_param_por = null;
let stream = null;
let canvas = null;
let env_video = null;
let cam = null;
let cont = null;
let ar_on = false;
let world = null;
let fullscr = false;
let tips_shown = false;

let click_left = null;
let click_right = null;
let flame_up_l = null;
let flame_down_l = null;
let flame_front_l = null;
let flame_up_r = null;
let flame_down_r = null;
let flame_front_r = null;
let flame_l_op = 0;
let flame_r_op = 0;
const FLAME_FADE_RATE = 1;
let audio_ctx = null;
let flame_snd = null;
let flame_l_gain = null;
let flame_r_gain = null;

let debug_time_dx = -Infinity;

function mouse2local(coords, elm) {
	let r = elm.getBoundingClientRect();
	let x = (coords[0] - r.left) / r.width * elm.offsetWidth;
	let y = (coords[1] - r.top) / r.height * elm.offsetHeight;
	return [x, y, x >= 0 && y >= 0 && x < elm.offsetWidth && y < elm.offsetHeight];
}

exports.init = function() {
    m_app.init({
        canvas_container_id: "chstovear_cont",
        callback: init_cb,
        show_fps: DEBUG,
        console_verbose: DEBUG,
//		quality : m_cfg.P_ULTRA,
        autoresize: false
    });
	
	if(typeof window.artoolkit_wasm_url != 'undefined') {
		window.addEventListener('artoolkit-loaded', load_ar);
		const scr = document.createElement('script');
		scr.setAttribute('src', 'lib/artoolkit_wasm.js');
		document.head.appendChild(scr);
	} else
		load_ar();

	load_snd();
	
	if(!homescreen_mode) {
		document.addEventListener('touchend', try_fscreen);
		document.addEventListener('fullscreenchange', on_fscreen);
	}
}

function load_ar() {
	window.removeEventListener('artoolkit-loaded', load_ar);
	ar_param_land = new ARCameraParam(APP_ASSETS_PATH + 'cam_640x360.dat', init_ar);
	ar_param_por = new ARCameraParam(APP_ASSETS_PATH + 'cam_360x640.dat', init_ar);
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_preloader.create_preloader();

    // ignore right-click on the canvas element
    canvas_elem.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    load();
}

function load() {
    m_data.load(APP_ASSETS_PATH + "chstovear.json", load_cb, preloader_cb);
}

function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

function load_cb(data_id, success) {

    if (!success) {
        console.log("b4w load failure");
        return;
    }

//    m_app.enable_camera_controls();

	canvas = m_cont.get_canvas();
	cont = _$('#chstovear_cont');
	cam = m_scs.get_active_camera();
	env_video = _$('.chstovear .env_video');
	world = m_scs.get_object_by_name('World');
	
	init_error();
    init_video();
	init_flame();
	
	window.addEventListener('resize', resize_ar);
}

async function init_video() {
	try {
		if(!DEBUG_VIDEO) {
			const cons = {
//				video: {facingMode: 'environment', width: {ideal: 640}, height: {ideal: 360}}
//				video: {facingMode: 'environment', width: {ideal: 480}, height: {ideal: 270}} Не работает на FF Mobile
				video: {facingMode: 'environment', width: 640, height: 360}
			};
			stream = await navigator.mediaDevices.getUserMedia(cons);
			log('stream_settings', stream.getVideoTracks()[0].getSettings());
			env_video.srcObject = stream;
		} else {
			//Горизонтально 640x280
			//Вертикально 360x560
//			env_video.src = 'res/hor.mp4';
			env_video.src = 'res/vert.mp4';
			env_video.autoplay = false;
			env_video.currentTime = 0;
			env_video.pause();
			_$('.chstovear .debug_controls').style.visibility = 'inherit';
			_$('.chstovear .debug_play').addEventListener('click', debug_play);
			_$('.chstovear .debug_time').addEventListener('mousedown', debug_time_mdown);
			window.addEventListener('mousemove', debug_time_mmove);
			window.addEventListener('mouseup', debug_time_mup);
		}
		env_video.addEventListener('loadedmetadata', init_ar);
	} catch(exc) {
		error(exc + ': ' + exc.message);
	}
};

function init_ar() {
	if(ar_param_land == null || !ar_param_land.complete
		|| ar_param_por == null || !ar_param_por.complete
		|| env_video == null || env_video.readyState == HTMLMediaElement.HAVE_NOTHING)
		return;
	let w = env_video.videoWidth;
	let h = env_video.videoHeight;
	if(w < h) {
		w = env_video.videoHeight;
		h = env_video.videoWidth;
	}
	log('ar_contr', w, h);
	
	ar_contr_land = new ARController(w, h, ar_param_land);
	ar_contr_land.loadMultiMarker(APP_ASSETS_PATH + 'multi-barcode-4x3.dat', ar_started);
	ar_contr_land.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
	ar_contr_land.addEventListener('getMultiMarker', proc_marker);
	ar_contr_por = new ARController(h, w, ar_param_por);
	ar_contr_por.loadMultiMarker(APP_ASSETS_PATH + 'multi-barcode-4x3.dat', ar_started);
	ar_contr_por.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
	ar_contr_por.addEventListener('getMultiMarker', proc_marker);
	
	m_cont.resize(w * VIEW_FACTOR, h * VIEW_FACTOR, false);
	canvas.style.width = '100%';
	canvas.style.height = '100%';
}

function ar_started() {
	if(ar_contr_land.getMultiMarkerCount() == 0 || ar_contr_por.getMultiMarkerCount() == 0)
		return;
	ar_on = true;
	resize_ar();
	m_main.set_render_callback(ar_tick);
	fscreen_warn();
	tips();
}

function resize_ar() {
    const screen_width = document.documentElement.clientWidth;
    const screen_height = document.documentElement.clientHeight;
	log('screen', screen_width, screen_height);

    const source_width = env_video.videoWidth
    const source_height = env_video.videoHeight;
	log('video', source_width, source_height);

    const source_aspect = source_width / source_height;
    const screen_aspect = screen_width / screen_height;
	
	let cont_width, cont_height, cont_top, cont_left;

    if (screen_aspect < source_aspect) {
		cont_height = screen_height;
		cont_width = source_aspect * cont_height;
		cont_top = 0;
		cont_left = -(cont_width - screen_width) / 2;
    } else {
		cont_width = screen_width;
		cont_height = 1 / (source_aspect / cont_width);
		cont_top = -(cont_height - screen_height) / 2;
		cont_left = 0;
    }
	
	cont.style.width = cont_width + "px";
	cont.style.height = cont_height + "px";
	cont.style.top = cont_top + "px";
	cont.style.left = cont_left + "px";
	
	log('cont', cont_width, cont_height);
	
	const or_land = source_width >= source_height;
	ar_contr = or_land ? ar_contr_land : ar_contr_por;
	log('orient', or_land ? 'land' : 'por');
	log('ar_contr', ar_contr.canvas.width, ar_contr.canvas.height);
	m_cont.resize(source_width * VIEW_FACTOR, source_height * VIEW_FACTOR, false);
	log('canvas', canvas.width, canvas.height);

	const camera_mat = ar_contr.getCameraMatrix();
	m_cam.set_projection(cam, camera_mat);
}

function ar_tick() {
	ar_contr.process(env_video);
}

function proc_marker(evt) {
	let trans_mat = evt.data.matrixGL_RH;

	const rot_x = m_mat4.fromXRotation(Math.PI / 2, _mat44_tmp2);
	trans_mat = m_mat4.multiply(rot_x, trans_mat, _mat44_tmp);

	
	const tsr = m_tsr.from_mat4(trans_mat, _tsr_tmp);

	const trans = m_tsr.get_trans(tsr, _vec3_tmp);
//	const new_trans = m_vec3.scale(trans, 0.02, _vec3_tmp);
	const new_trans = m_vec3.scale(trans, 0.015, _vec3_tmp);
//	const new_trans = m_vec3.scale(trans, 0.01, _vec3_tmp);
	m_tsr.set_trans(new_trans, tsr);
	
	m_trans.set_tsr(world, tsr);
	
	//Вручную имитируем цилиндрический биллборд, т.к. автоматически он работает неправильно из-за того,
	//что вращается не камера, а мир
	m_trans.get_rotation_euler(world, _vec3_tmp);
	m_trans.set_rotation_euler_rel(flame_up_l, 0, 0, -_vec3_tmp[2]);
	m_trans.set_rotation_euler_rel(flame_up_r, 0, 0, -_vec3_tmp[2]);
	m_trans.set_rotation_euler_rel(flame_front_l, 0, _vec3_tmp[1], 0);
	m_trans.set_rotation_euler_rel(flame_front_r, 0, _vec3_tmp[1], 0);
}

function init_flame() {
/*	const touch_sens = m_ctl.create_touch_click_sensor();
	const click_sens = m_ctl.create_mouse_click_sensor();
	m_ctl.create_sensor_manifold(null, "click", m_ctl.CT_TRIGGER, [touch_sens, click_sens], (s) => s[0] || s[1], flame_touch);*/
	const elapsed_sensor = m_ctl.create_elapsed_sensor();
	m_ctl.create_sensor_manifold(null, "flame", m_ctl.CT_CONTINUOUS, [elapsed_sensor], null, flame_fade);

	canvas.addEventListener('mousedown', flame_touch);
	canvas.addEventListener('touchstart', flame_touch);
	
	flame_down_l = m_scs.get_object_by_name('ОгоньЛевыйНиз');
	flame_down_r = m_scs.get_object_by_name('ОгоньПравыйНиз');
	flame_up_l = m_scs.get_object_by_name('ОгоньЛевыйВерх');
	flame_up_r = m_scs.get_object_by_name('ОгоньПравыйВерх');
	flame_front_l = m_scs.get_object_by_name('ОгоньЛевыйПеред');
	flame_front_r = m_scs.get_object_by_name('ОгоньПравыйПеред');
	click_left = m_scs.get_object_by_name('КликЛевый');
	click_right = m_scs.get_object_by_name('КликПравый');
	
	update_flame();
}

/*function flame_touch(obj, id, pulse) {
	const payl = m_ctl.get_sensor_payload(null, id, 0);
//	log('payl', payl, id, pulse);
	if(pulse == 1) {*/

let touched = false;

function flame_touch(evt) {
	log('evt', evt);
	let e;
	if(evt.type == 'touchstart') {
		touched = true;
		e = evt.changedTouches[0];
	} else {
		if(!touched) {
			e = evt;
		} else {
			touched = false;
			return;
		}
	}
	
	const obj = m_scs.pick_object(...mouse2local([e.clientX, e.clientY], canvas));
//	log('obj', obj);
	if(obj != null) {
//		log('touched');
		init_snd();
		if(obj == click_left) {
//			log('touched_left');
			flame_l_op = flame_l_op == 0 ? FLAME_FADE_RATE * 0.1 : -flame_l_op;
		}else if(obj == click_right) {
//			log('touched_right');
			flame_r_op = flame_r_op == 0 ? FLAME_FADE_RATE * 0.1 : -flame_r_op;
		}
	}
}

function update_flame() {
	m_material.set_nodemat_value(flame_down_l, ["ОгоньНиз", "Прозрачность"], Math.abs(flame_l_op));
	m_material.set_nodemat_value(flame_up_l, ["ОгоньВерх", "Прозрачность"], Math.abs(flame_l_op));
	m_material.set_nodemat_value(flame_front_l, ["ОгоньВерх", "Прозрачность"], Math.abs(flame_l_op));
	if(flame_l_gain != null)
		flame_l_gain.gain.setValueAtTime(Math.abs(flame_l_op), 0);
	
	m_material.set_nodemat_value(flame_down_r, ["ОгоньНиз", "Прозрачность"], Math.abs(flame_r_op));
	m_material.set_nodemat_value(flame_up_r, ["ОгоньВерх", "Прозрачность"], Math.abs(flame_r_op));
	m_material.set_nodemat_value(flame_front_r, ["ОгоньВерх", "Прозрачность"], Math.abs(flame_r_op));
	if(flame_r_gain != null)
		flame_r_gain.gain.setValueAtTime(Math.abs(flame_r_op), 0);
}

function flame_fade (obj, id) {
	let elapsed = m_ctl.get_sensor_value(obj, id, 0);
	if(flame_l_op > 0 && flame_l_op < 1) {
		flame_l_op += FLAME_FADE_RATE * elapsed;
		if(flame_l_op > 1) flame_l_op = 1;
		update_flame();
	} else if(flame_l_op < 0) {
		flame_l_op += FLAME_FADE_RATE * elapsed;
		if(flame_l_op > 0) flame_l_op = 0;
		update_flame();
	}
	if(flame_r_op > 0 && flame_r_op < 1) {
		flame_r_op += FLAME_FADE_RATE * elapsed;
		if(flame_r_op > 1) flame_r_op = 1;
		update_flame();
	} else if(flame_r_op < 0) {
		flame_r_op += FLAME_FADE_RATE * elapsed;
		if(flame_r_op > 0) flame_r_op = 0;
		update_flame();
	}
}

async function load_snd() {
	audio_ctx = new AudioContext();
	
//	log('load_snd');
	
	let buf = await (await fetch('assets/flame_snd.mp3')).arrayBuffer();
	audio_ctx.decodeAudioData(buf, function(data) {
//		log('decode_snd');
		flame_snd = data;
	});
}

function init_snd() {
	if(flame_l_gain != null)
		return;
	
//	log('init_snd');
	
	const flame_src = audio_ctx.createBufferSource();
	flame_src.buffer = flame_snd;
	flame_src.loop = true;
	flame_src.start(0);
	flame_l_gain = audio_ctx.createGain();
	flame_src.connect(flame_l_gain);
	flame_l_gain.connect(audio_ctx.destination);
	flame_l_gain.gain.setValueAtTime(0, 0);
	flame_r_gain = audio_ctx.createGain();
	flame_r_gain.gain.setValueAtTime(0, 0);
	flame_src.connect(flame_r_gain);
	flame_r_gain.connect(audio_ctx.destination);
}

function try_fscreen(evt) {
	if(fullscr || DEBUG_VIDEO)
		return;
	_$('.chstovear').requestFullscreen();
}

function on_fscreen(evt) {
	fullscr = document.fullscreenElement != null;
	log('fullscr', fullscr);
	if(fullscr) {
	} else {
	}
	fscreen_warn();
}

function fscreen_warn() {
	_$('.chstovear .fscreen_warn').style.display = fullscr || !tips_shown || DEBUG_VIDEO ? 'none' : 'inherit';
}

function tips() {
	if(!tips_shown) {
		_$('.chstovear .tips').style.display = DEBUG_VIDEO ? 'none' : 'inherit';
		document.addEventListener('touchend', tips);
		tips_shown = true;
	} else {
		_$('.chstovear .tips').style.display = 'none';
		document.removeEventListener('touchend', tips);
	}
}

function init_error() {
	_$('.chstovear .error_btn').addEventListener('click', error_show);
	_$('.chstovear .error_pnl .error_close').addEventListener('click', error_hide);
}

function error_show() {
	_$('.chstovear .error_btn').style.visibility = 'hidden';
	_$('.chstovear .error_pnl').style.visibility = 'inherit';
}

function error_hide() {
	_$('.chstovear .error_pnl').style.visibility = 'hidden';
}

function error(msg) {
	const n = document.createElement('div');
	n.innerHTML = msg;
	_$('.chstovear .error_pnl > div').appendChild(n);
	_$('.chstovear .error_btn').style.visibility = 'inherit';
}

function debug_play() {
	if(env_video.paused)
		env_video.play();
	else
		env_video.pause();
}

function debug_time_mdown(evt) {
	debug_time_dx = evt.clientX - _$('.chstovear .debug_time').offsetLeft;
}

function debug_time_mmove(evt) {
	if(debug_time_dx !== -Infinity) {
		const mx = _$('.chstovear .debug_track').offsetWidth - _$('.chstovear .debug_time').offsetWidth;
		let x = evt.clientX - debug_time_dx;
		if(x < 0) x = 0; else if(x > mx) x = mx;
		_$('.chstovear .debug_time').style.left = x + 'px';
		
		env_video.currentTime = env_video.duration * x / mx;
	}
}

function debug_time_mup(evt) {
	if(debug_time_dx !== -Infinity) {
		debug_time_mmove(evt);
		debug_time_dx = -Infinity;
	}
}

});

function chstovear_load() {
	window.removeEventListener('remote_log_start', chstovear_load);
	chstovear_start();
}

function chstovear_start() {
	homescreen_mode = (new URLSearchParams(location.search)).has('homescreen');
	b4w.require("chstovear_main").init();
}

if(/debug_mode=true/.test(document.cookie)) {
	const dn = document.createElement('script');
	dn.setAttribute('type', 'module');
	dn.setAttribute('src', '/debug_m/debug_m.js');
	document.head.appendChild(dn);
}

if(has_url_param('remote_log')) {
	window.addEventListener('remote_log_start', chstovear_load);
} else
	chstovear_load();

/*TODO
1. 
2. 
3. 
4. 
5. 
6. 

*/