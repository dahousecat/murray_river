<?php

$images = [];

$instagram_img_data = [];
if (($handle = fopen('instagram.csv', 'r')) !== FALSE) {
    while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
        $instagram_img_data[$data[0]] = $data;
    }
    fclose($handle);
}

$files = scandir('img-instagram');

include('iptc.php');

$time_mod = 60 * 60;

foreach($files as $file) {

    $id = str_replace('.jpg', '', $file);

    if(!isset($instagram_img_data[$id])) {
        continue;
    }

    $src = '/img-instagram/' . $file;

    $file_data = $instagram_img_data[$id];

    $ts = $file_data[3];
    $desc = $file_data[4];

    if(isset($_GET['date']) && $_GET['date'] != date('Y-m-d', $ts)) {
        continue;
    }

    $images[] = array(
        'src' => $src,
        'type' => 'instagram',
        'ts' => $ts,
        'date' => date('Y-m-d', $ts),
        'time' => date('H:i:s', $ts),
        'desc' => $desc,
    );

}

$files = array_diff(scandir('img-camera'), array('..', '.'));

foreach($files as $file) {

    $objIPTC = new IPTC('img-camera/' . $file);

    $date = $objIPTC->getValue(IPTC_CREATED_DATE);
    $time = $objIPTC->getValue(IPTC_CREATED_TIME);

    $year = substr($date, 0, 4);
    $month = substr($date, 4, 2);
    $day = substr($date, 6, 2);

    if(isset($_GET['date']) && $_GET['date'] != "$year-$month-$day") {
        continue;
    }

    $hour = substr($time, 0, 2);
    $min = substr($time, 2, 2);
    $sec = substr($time, 4, 2);

    $ts = mktime($hour, $min, $sec, $month, $day, $year);

    $images[] = array(
        'src' => '/img-camera/' . $file,
        'type' => 'camera',
        'ts' => $ts + $time_mod,
        'date' => "$year-$month-$day",
        'time' => "$hour:$min:$sec",
        'desc' => '',
    );

}

usort($images, function($a, $b) {
    return $a['ts'] - $b['ts'];
});

//$images = [$images[0], $images[5], $images[10]];

header('Content-Type: application/json');
echo json_encode($images);
