<style>
    div {
        float: left;
        width: 33%;
        font-size: 10px;
        text-align: center;
        margin-bottom: 20px;
    }
</style>

<?php

//$file = "photo.jpg";
//$objIPTC = new IPTC($file);
//
////set title
//$objIPTC->setValue(IPTC_HEADLINE, "A title for this picture");
//
////set description
//$objIPTC->setValue(IPTC_CREATED_DATE, "Some words describing what can be seen in this picture.");
//$objIPTC->setValue(IPTC_CREATED_TIME, "Some words describing what can be seen in this picture.");
//$objIPTC->setValue(IPTC_CAPTION, "Some words describing what can be seen in this picture.");
//
//echo $objIPTC->getValue(IPTC_HEADLINE);

$images = [];
if (($handle = fopen('instagram.csv', 'r')) !== FALSE) {
    while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
        $images[$data[0]] = $data;
    }
    fclose($handle);
}

//foreach($img-instagram as $image) {
//    echo '<div>';
//    echo $image[0];
//    echo '<img src="' . $image[2] . '" /></div>';
//}

$files = scandir('img-instagram');

include('iptc.php');

foreach($files as $file) {

    $id = str_replace('.jpg', '', $file);

    if(!isset($images[$id])) {
        continue;
    }

    $src = '/img-instagram/' . $file;
    echo '<img src="' . $src . '" width="200" /><br/>';

    $file_data = $images[$id];

//    print_r($file_data);

    $ts = $file_data[3];

    $date = date('Y-m-d', $ts);
    $time = date('H:i:s', $ts);
    $desc = $file_data[4];

    echo 'Date: ' . $date . '<br>';
    echo 'Time: ' . $time . '<br>';
    echo 'Desc: ' . $desc . '<br>';

    $objIPTC = new IPTC('img-instagram/' . $file);
//    touch('img-instagram/' . $file, $ts);
//    $objIPTC->setValue(IPTC_CREATED_DATE, $date);
//    $objIPTC->setValue(IPTC_CREATED_TIME, $time);
//    $objIPTC->setValue(IPTC_CAPTION, $desc);

    echo 'Date1: ' . $objIPTC->getValue(IPTC_CREATED_DATE) . '<br>';
    echo 'Time1: ' . $objIPTC->getValue(IPTC_CREATED_TIME) . '<br>';
    echo 'Caption1: ' . $objIPTC->getValue(IPTC_CAPTION) . '<br>';

//    $exif_data = exif_read_data('img-instagram/' . $file);
//    echo '<pre>';
//    print_r($exif_data);
//    echo '</pre>';

    echo '<br/><hr><br>';

}

//echo '<pre>';
//print_r($img-instagram);
//echo '</pre>';

die();
?>

<!DOCTYPE html>
<html>
<head>
    <title>Simple Map</title>
    <meta name="viewport" content="initial-scale=1.0">
    <meta charset="utf-8">
    <style>
        /* Always set the map height explicitly to define the size of the div
         * element that contains the map. */
        #map {
            height: 100%;
        }
        /* Optional: Makes the sample page fill the window. */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
<div id="map"></div>
<script>
    var map;
    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: -34.397, lng: 150.644},
            zoom: 8
        });
    }
</script>
<script src="https://maps.googleapis.com/maps/api/js?callback=initMap"
        async defer></script>
</body>
</html>
