<!DOCTYPE html>
<html>

<head>

<title>Chungsu Stove AR</title>

<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1.0, user-scalable=no, width=device-width">
<link rel="manifest" href="manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Virtual 3D Kitchen">
<link rel="apple-touch-icon" href="images/chstove_152.png">
<meta name="msapplication-TileImage" content="images/chstove_144.png">
<meta name="msapplication-TileColor" content="#89bcd9">
<link type="text/css" rel="stylesheet" href="cache.css">

<link rel="stylesheet" href="chstovear.css" type="text/css">

<script type="text/javascript" src="./b4w.whitespace.min.js"></script>
<script>if(/debug_mode=true/.test(document.cookie)) document.write('<script src="/debug.js"></' + 'script>')</script>
<script>
window.artoolkit_wasm_url = 'lib/artoolkit_wasm.wasm';
</script>
<!--<script type="text/javascript" src="lib/artoolkit_wasm.js"></script>-->
<!--<script type="text/javascript" src="lib/artoolkit.min_my_debug.js"></script>-->
<script type="text/javascript" src="chstovear.js"></script>

</head>

<body>
<div class="chstovear">
<div id="chstovear_cont">
<video class="env_video" autoplay playsinline></video>
</div>
<div class="fscreen_warn">
Tap to enter full screen mode
</div>
<div class="tips">
<i><u>Tips:</u></i><br/><br/>
&bullet;Look around by turning the marker paper<br/><br/>
&bullet;Zoom by moving the paper closer to your gadget<br/><br/>
&bullet;Click on the stove to start/stop the fire<br/><br/>
<div class="add2home_btn" ontouchend="cache.add2home()">Add to Homescreen</div>
<div class="src" ontouchend="location.href='chstovear.zip'">Download sources</div>
</div>
<a class="error_btn" href="javascript:void(false)">!</a>
<div class="error_pnl">
<div></div>
<a class="error_close" href="javascript:void(false)">Close</a>
</div>
<div class="debug_controls">
<a class="debug_play" href="javascript:void(false)">Play</a>
<div class="debug_track"><div class="debug_time"></div></div>
</div>
</div>
<?require('_cache.php')?>
</body>

</html>
