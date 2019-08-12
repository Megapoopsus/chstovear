<?
if(isset($_GET['from_sw'])) {
	header('Content-type: application/javascript');
	header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");
}

$shell_locs = array(
	'lib',
	'images',
	'cache.css',
	'chstovear.css',
	'index.php',
	'cache.js',
	'chstovear.js',
	'b4w.whitespace.min.js'
);

$model_locs = array(
	'assets'
);

function fconv($f) {
	if(strtoupper(substr(PHP_OS, 0, 3)) === 'WIN')
		return mb_convert_encoding($f, 'UTF-8', 'CP1251');
	return $f;
}

function scan_loc($loc, &$flist) {
	$size = 0;
	if(is_dir($loc)) {
		$files = array_diff(scandir($loc), array('.', '..'));
		foreach ($files as $file) {
			if(strpos($file, '_') !== 0) {
				if(is_dir("$loc/$file"))
					$size += scan_loc("$loc/$file", $flist);
				else {
					$flist[] = fconv("$loc/$file");
//					$flist[] = "$loc/$file";
					$size += filesize("$loc/$file");
				}
			}
		}
	} else {
		$flist[] = fconv($loc);
//		$flist[] = $loc;
		$size += filesize($loc);
	}
	return $size;
}

$caches = array();
$size = 0;
$flist = array();
foreach($shell_locs as $loc)
	$size += scan_loc($loc, $flist);
$caches['shell'] = array('size' => $size, 'files' => $flist);

$size = 0;
$flist = array();
foreach($model_locs as $loc)
	$size += scan_loc($loc, $flist);
$caches['model'] = array('size' => $size, 'files' => $flist);

if(isset($_GET['from_sw'])) {
	echo json_encode($caches);
}
?>