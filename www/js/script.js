var map;
var gps = [];
var path;
var track = [];
var images = [];
var trackResolution = 0.1;
var px_per_cord = 2;
var $debug;
var distance;
var year, month, day;
var docHeight;
var min_image_gap = 10;
var clusters = [];
var image_container_width;

var cluster_grab_dist = 400;
var image_container_multiplier = 1.5;
var gps_index;
var displayDate, displayTime;
var scrolling = false;
var distToClosestImage;
var scrollTimer;
var currentActiveImageIndex;
var pass_limit = 1;

var showCameraTrack = getParameterByName('cameratrack') == null ? false : true;

$(document).ready(function(){
    $debug = $('#debug');
});


// Master functions

function initMap() {

    window.scrollTo(0, 0);

    var perc = $(window).scrollTop() / ($(document).height() - $(window).height());
    gps_index = Math.round( gps.length * perc );

    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: gps[0].lat, lng: gps[0].lng},
        zoom: 12,
        //mapTypeId: 'satellite',
        mapTypeId: 'terrain',
    });

    map.addListener('dragend', function() {
        addMarkerShadows();
    });

    docHeight = gps.length * px_per_cord;

    $('#spacer').height(docHeight);

    $(window).scroll(function(){

        perc = $(window).scrollTop() / ($(document).height() - $(window).height());
        gps_index = Math.round( gps.length * perc );

        // Loop over every gps point and hide or show line as appropriate
        distance = 0;
        for (i = 1; i <= gps.length -1; i++) {
            if(i <= gps_index) {
                show_line(i);
            } else {
                hide_line(i);
            }
        }


        if(typeof gps[gps_index] != 'undefined') {
            displayDate = gps[gps_index].date;
            displayTime = gps[gps_index].time;
        }

        debug({
            // total: gps.length,
            index: gps_index,
            date: (typeof displayDate != 'undefined' ? displayDate : ''),
            time: (typeof displayTime != 'undefined' ? displayTime : ''),
            distance: Math.round(distance / 1000) + 'km',
            // scrollTop: $(window).scrollTop(),
        });

//            var scrollTop = docHeight * ( gps_index / gps.length );

        if(typeof gps[gps_index] != 'undefined') {
            map.setCenter(new google.maps.LatLng(gps[gps_index].track[0], gps[gps_index].track[1]));
        }

        $('#inner-images').css({
            left: ( ($(window).scrollTop() + $(window).height() * perc) * image_container_multiplier ) * -1,
        });

        addMarkerShadows();

    });

    createCameraTrack();

    addImages();

    var timeout = 16000;

    $('#back').on({
        'mousedown touchstart': function() {
            $('html, body').animate({scrollTop:  0}, timeout);
        },
        'mouseup touchend': function() {
            $('html, body').stop(true);
        }
    }).on({'click': arrowClick});

    $('#forward').on({
        'mousedown touchstart': function() {

            $('html, body').animate({
                scrollTop:  $('html, body')[0].scrollHeight
            }, timeout);

        },
        'mouseup touchend': function() {
            $('html, body').stop(true);
        }
    }).on({'click': arrowClick});

}

function arrowClick() {

    var mod = $(this).attr('id') == 'forward' ? 1 : -1;
    var target_gps_index, target_img_index;
    var shrink = false;
    var grow = false;


    if($('.active-image').length) {

        // If image is zoomed in

        var activeImageId = $('.active-image').find('img').attr('attr-id');
        // shrinkImage(images[activeImageId]);
        shrink = images[activeImageId];

        if(typeof images[currentActiveImageIndex + mod] == 'undefined') {
            target_gps_index = mod == 1 ? gps.length : 0;
        } else {
            var targetImage = images[currentActiveImageIndex + mod];
            target_img_index = currentActiveImageIndex + mod;
            target_gps_index = targetImage.gps_index;
            currentActiveImageIndex+= mod;
        }

    } else {

        // Image NOT zoomed in

        var minMarkerDist = gps.length / 80;

        // find image based on scroll position

        if(mod == 1) {

            // dir = forward then first image with gps index bigger that current
            for (i = 0; i <= images.length -1; i++) {
                if(images[i].gps_index > gps_index + minMarkerDist) {
                    target_gps_index = images[i].gps_index;
                    break;
                }
            }

        } else {

            // dir = back then biggest before current

            for (i = images.length -1; i >= 0; i--) {

                if(images[i].gps_index < gps_index - minMarkerDist) {

                    target_gps_index = images[i].gps_index;
                    break;

                }
            }

        }

        if(typeof target_gps_index == 'undefined') {
            target_gps_index = mod == 1 ? gps.length : 0;
        }

    }

    if(typeof target_img_index != 'undefined') {
        // growImage(images[target_img_index]);
        grow = images[target_img_index];
    }

    var dist = Math.abs(gps_index - target_gps_index);

    var min_duration = 500;
    var duration = dist * 4;


    if(shrink && grow) {
        shrinkImage(shrink, scrollTo, [target_gps_index, duration, growImage, [grow]]);
    }
    else if (shrink) {
        shrinkImage(shrink, scrollTo, [target_gps_index, duration]);
    } else {

        if(duration < min_duration) {
            duration = min_duration;
        }

        scrollTo(target_gps_index, duration);
    }

}

// GPS functions

function loadGPSdata() {

    var tripDay = getParameterByName('day');
    if(tripDay == null) {
        tripDay = 1;
    }

    $.get('/gps/Track_DAY%20' + tripDay + '.gpx', function(data) {
        var xml = $.parseXML(data);
        var $xml = $(xml);
        var prevLatLng;

        $xml.find('trkpt').each(function(index) {

            var ts = Date.parse($(this).find('time').text());
            var date = new Date(ts);
            day = ('0' + date.getDate()).substr(-2, 2);
            month = ('0' + (date.getMonth() + 1)).substr(-2, 2);
            year = date.getFullYear();
            var hour = ('0' + (date.getHours() + 1)).substr(-2, 2);
            var min = ('0' + (date.getMinutes() + 1)).substr(-2, 2);

            var lat = parseFloat($(this).attr('lat'));
            var lng = parseFloat($(this).attr('lon'));
            var LatLng = new google.maps.LatLng(lat, lng);

            var distance = 0;
            if(typeof prevLatLng != 'undefined') {
                distance = google.maps.geometry.spherical.computeDistanceBetween (prevLatLng, LatLng);
            }

            gps.push({
                ts: ts,
                date: day + '-' + month + '-' + year,
                time: hour + ':' + min,
                lat: lat,
                lng: lng,
                LatLng: LatLng,
                distance: distance,
            });

            prevLatLng = LatLng;

        });

        trim_gps_data();

//            initMap();

    });

}

function trim_gps_data() {

    var trim_dist_limit = 200; // meters

    // Trim off start
    for (i = 1; i <= gps.length -1; i++) {
        distance = google.maps.geometry.spherical.computeDistanceBetween (gps[0].LatLng, gps[i].LatLng);
        if(distance < trim_dist_limit) {
            gps.splice(i, 1);
        } else {
            break;
        }
    }

    // Trim off end
    var end_point = gps[gps.length - 1].LatLng;
    for (i = gps.length - 1; i > 1; i--) {
        distance = google.maps.geometry.spherical.computeDistanceBetween (end_point, gps[i].LatLng);

        if(distance < trim_dist_limit) {

            if(i != gps.length) {
                gps.splice(i, 1);
            }

        } else {
            break;
        }
    }

    initMap();

}


// Map functions

function createCameraTrack() {

    var gap = Math.round(gps.length * trackResolution);
    var TrackLatLng, LastTrackLatLng;
    var distLimit = 2000;

    // Cut down the number of points to use
    for (i = 0; i <= gps.length -1; i+=gap) {

        // make sure not too close to last marker
        TrackLatLng = gps[i].LatLng;
        if(typeof LastTrackLatLng != 'undefined') {
            var distance = google.maps.geometry.spherical.computeDistanceBetween(TrackLatLng, LastTrackLatLng);
            if(distance < distLimit) {
                continue;
            }
        }

        LastTrackLatLng = TrackLatLng;

        track.push( [ gps[i].lat, gps[i].lng ] );

    }

    // make sure last track point is last gps point
    track[track.length-1] = [ gps[gps.length-1].lat, gps[gps.length-1].lng ];


    if(showCameraTrack) {
        // add markers for curve control points
        for (i = 0; i <= track.length -1 ; i++) {
            var image = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';

            console.log(track[i][0]);

            var marker = new google.maps.Marker({
                position: {lat: track[i][0], lng: track[i][1]},
                // position: new google.maps.LatLng(track[i][0], track[i][1]),
                map: map,
                title: 'Hello World!',
                icon: image
            });
        }
    }


    // create the smoothed out path
    path = Smooth(track, {
        method: Smooth.METHOD_CUBIC,
    });

    // Set the camera location for every gps point
    var path_points = [];
    for (i = 0; i <= gps.length ; i++) {
        var path_perc = i / gps.length;
        var path_res = path(track.length * path_perc);
        path_points.push({
            LatLngArr: path_res,
            LatLng: new google.maps.LatLng(path_res[0], path_res[1])
        });
    }

    //console.log(path_points);
    var lastLowestDistIndex;

    // Assign each gps point a camera track location
    for (i = 0; i <= gps.length -1; i++) {

        // assign point on curve closest to this marker
        var lowestDist = null;
        var lowestDistIndex = null;

        for (x = (typeof lastLowestDistIndex == 'undefined' ? 0 : lastLowestDistIndex); x <= path_points.length -1; x++) {
            var distance = google.maps.geometry.spherical.computeDistanceBetween(gps[i].LatLng, path_points[x].LatLng);

            if(lowestDist == null) {
                lowestDist = distance;
                lowestDistIndex = x;
            }
            else if(distance < lowestDist) {
                lowestDist = distance;
                lowestDistIndex = x;
            }
        }

        // Never go back - always forwards
        if(typeof lastLowestDistIndex != 'undefined' && lowestDistIndex < lastLowestDistIndex) {
            lowestDistIndex = lastLowestDistIndex;
        }

        lastLowestDistIndex = lowestDistIndex;

        gps[i].track = path_points[lowestDistIndex].LatLngArr;
    }

}

// Image functions

function addImages() {

    image_container_width = docHeight * image_container_multiplier;

    $('#inner-images').width(image_container_width);

    $.get('/images.php?date=' + year + '-' + month + '-' + day, function(data) {

        $.each(data, function(index, image){

            var time_gap, this_time_gap, last_time_gap;

            // Loop gps data to find point with closest time to this image
            for (i = 0; i <= gps.length -1; i++) {
                this_time_gap = Math.abs((gps[i].ts / 1000) - image.ts);

                if(typeof last_time_gap != 'undefined' && this_time_gap > last_time_gap) {
                    image.gps_index = i;
                    break;
                }

                if(typeof time_gap == 'undefined' || this_time_gap < time_gap) {

                    time_gap = this_time_gap;
                    image.gps_index = i;
                }

                last_time_gap = this_time_gap;

            }

            image.infowindow = new google.maps.InfoWindow({
                content: '<img src="' + image.src + '" style="width: 200px;" />'
            });

            image.marker = new google.maps.Marker({
                position: {lat: gps[image.gps_index].lat, lng: gps[image.gps_index].lng},
                map: map,
                title: image.desc
            });

            image.marker.addListener('click', function() {
                scrollTo(image.gps_index);
            });

            // Place image on the image bar
            var perc = (image.gps_index / gps.length) * 100;

            var imgStr = '<div class="image-wrap" id="image-' + index + '">';
            imgStr = imgStr + '<img src="' + image.src + '" attr-id="' + index + '" class="image" />';
            imgStr = imgStr + '<p>' + image.desc + '</p>';
            imgStr = imgStr + '</div>';
            image.$imageWrap = $(imgStr);
            image.$image = image.$imageWrap.find('.image');
            image.$imageWrap.css({height: 96});

            $('#inner-images').append(image.$imageWrap);

            image.left = ( (perc / 100) * image_container_width ) + ( $(window).width() / 2 );

            // don't let images occupy the exact same spot - compare with prev
            if(typeof images[index - 1] != 'undefined' && images[index - 1].left == image.left) {
                image.left += 1;
            }

            image.$imageWrap.css({ left: image.left});

            image.$image
                .attr('alt', image.desc)
                .click(imageClick);

            images.push(image);

        });

        // Set timeout to give time for images to get width
        setTimeout(function(){
            $.each(images, function(index, image){
                image.width = image.$image.width();
            });
            spaceOutImages();
        },0);

    });

}

function spaceOutImages() {

    if(pass_limit <= 0) {
//            console.log('cant space out images - pass limit reached');
        return setImagePositions();
    }

    pass_limit--;

    // first pass - add gaps for each image
    var any_touching = calcImageGaps();

    if(!any_touching) {
        return setImagePositions();
    }

    // second pass - create clusters
    makeImageClusters();

    // space out images in each cluster
    spaceOutClusterImages();

    // space out the clusters themselves
    //spaceOutClusters();

    // Work out each images position based off new cluster centres
    calcImagePositions();

    // now clusters may have merged into each other so make another pass
    spaceOutImages();

}

function calcImageGaps() {

    var any_touching = false;

    for (var i = 0; i <= images.length -1; i++) {

        var my_left = images[i].left;
        var my_right = my_left + images[i].width;
        var prev_left = typeof images[i-1] == 'undefined' ? 'undefined' : images[i-1].left;
        var prev_right = typeof images[i-1] == 'undefined' ? 'undefined' : prev_left + images[i-1].width;
        var next_left = typeof images[i+1] == 'undefined' ? 'undefined' : images[i+1].left;
        var next_right = typeof images[i+1] == 'undefined' ? 'undefined' : prev_left + images[i+1].width;

        if(i == 0) {
            // first one
            images[i].back_gap = my_left;
            images[i].forward_gap = next_left - my_right;
        } else if(i == images.length - 1) {
            // last one
            images[i].back_gap = my_left - prev_right;
            images[i].forward_gap = image_container_width - my_right;
        } else {
            images[i].back_gap = my_left - prev_right;
            images[i].forward_gap = next_left - my_right;
        }

        // Also add image centre point
        images[i].centre = images[i].left + (images[i].width / 2)

        if(images[i].back_gap < 0 || images[i].forward_gap < 0) {
            any_touching = true;
        }

//            console.log({
//                i: i,
//                my_left: my_left,
//                my_right: my_right,
//                my_width: images[i].width,
//                back_gap: images[i].back_gap,
//                forward_gap: images[i].forward_gap,
//            });

    }

    return any_touching;
}

function makeImageClusters() {

    clusters = [];

    for (var i = 0; i <= images.length -1; i++) {

        if(images[i].back_gap - cluster_grab_dist < 0) {
            // i'm just touching the one behind me
            // add to the last cluster
            clusters[clusters.length - 1].images.push(i);
        }
        else if(images[i].back_gap + cluster_grab_dist > 0 && images[i].forward_gap - cluster_grab_dist < 0) {
            // i'm just touching the one in front of me
            // create a new cluster
            clusters.push({
                images: [i],
            });
        }
        else if(images[i].back_gap - cluster_grab_dist < 0 && images[i].forward_gap - cluster_grab_dist < 0) {
            // i'm touching the one in front of me and behind me
            // add to the last cluster
            clusters[clusters.length - 1].images.push(i);
        }
        else {
            // i'm not touching anyone
//                console.log('not touching anyone');
        }

    }

//        console.log('made ' + clusters.length + ' clusters');
}

function spaceOutClusterImages() {

    // calc centre point and width required for each cluster
    for (var i = 0; i <= clusters.length -1; i++) {

        var cluster = clusters[i];

        // Work out total width required - loop this clusters images
        cluster.width = 0;
        cluster.centre = 0;
        for (var x = 0; x <= cluster.images.length -1; x++) {
            var image =  images[cluster.images[x]];
            cluster.width += image.width + min_image_gap;
            cluster.centre += image.centre;
        }
        cluster.width -= min_image_gap;

        // Where is the cluster centre?
        cluster.centre = cluster.centre / cluster.images.length;
        cluster.left = cluster.centre - (cluster.width / 2);
        cluster.right = cluster.centre + (cluster.width / 2);

    }
}

function spaceOutClusters() {

    // work out gaps between clusters
    for (var i = 0; i <= clusters.length -1; i++) {

        var cluster = clusters[i];

        var my_left = cluster.left;
        var my_right = cluster.right;
        var prev_left = typeof clusters[i-1] == 'undefined' ? 'undefined' : clusters[i-1].left;
        var prev_right = typeof clusters[i-1] == 'undefined' ? 'undefined' : prev_left + clusters[i-1].width;
        var next_left = typeof clusters[i+1] == 'undefined' ? 'undefined' : clusters[i+1].left;
        var next_right = typeof clusters[i+1] == 'undefined' ? 'undefined' : prev_left + clusters[i+1].width;

        if(i == 0) {
            // first one
            cluster.back_gap = my_left;
            cluster.forward_gap = next_left - my_right;
        } else if(i == images.length - 1) {
            // last one
            cluster.back_gap = my_left - prev_right;
            cluster.forward_gap = image_container_width - my_right;
        } else {
            cluster.back_gap = my_left - prev_right;
            cluster.forward_gap = next_left - my_right;
        }

    }

    // set new centers
    for (var i = 0; i <= clusters.length -1; i++) {

        if(clusters[i].back_gap < 0) {
            // i'm just touching the one behind me

            var move_dist = (Math.abs(clusters[i].back_gap) + min_image_gap) / 2;

            // move me forwards 50%
            clusters[i].center += move_dist;
            clusters[i].left += move_dist;
            clusters[i].right += move_dist;

            // move one behind back 50%
            if(typeof clusters[i-1] != 'undefined') {
                clusters[i-1].center -= move_dist;
                clusters[i-1].left -= move_dist;
                clusters[i-1].right -= move_dist;
            }

            return spaceOutClusters();

        }
        else if(clusters[i].back_gap > 0 && clusters[i].forward_gap < 0) {
            // i'm just touching the one in front of me

            var move_dist = (Math.abs(clusters[i].forward_gap) + min_image_gap) / 2;

            // move me back 50%
            clusters[i].center -= move_dist;
            clusters[i].left -= move_dist;
            clusters[i].right -= move_dist;

            // move one in front forwards 50%
            if(typeof clusters[i+1] != 'undefined') {
                clusters[i+1].center += move_dist;
                clusters[i+1].left += move_dist;
                clusters[i+1].right += move_dist;
            }

            return spaceOutClusters();


        }
        else if(clusters[i].back_gap < 0 && clusters[i].forward_gap < 0) {
            // i'm touching the one in front of me and behind me
            // panic
//                console.log('panic - cluster touching on both sides');

        }
        else {
            // i'm not touching anyone
//                console.log('cluster not touching anyone');
        }

    }

}

function calcImagePositions() {

    // calc centre point and width required for each cluster
    for (var i = 0; i <= clusters.length -1; i++) {

        var cluster = clusters[i];

        // set the new image positions
        var current_pos = cluster.left;
        for (var x = 0; x <= cluster.images.length -1; x++) {
            var image =  images[cluster.images[x]];
            image.left = current_pos;
            current_pos += image.width + min_image_gap;
        }
    }
}

function setImagePositions() {

    // set position
    for (i = 0; i <= images.length -1; i++) {
        images[i].$imageWrap.css({ left: images[i].left });
        //$('#inner-images').append(images[i].$image);
    }

    addMarkerShadows();
}

function imageClick() {

    var image = images[$(this).attr('attr-id')];

    if(image.$imageWrap.hasClass('active-image')) {
        shrinkImage(image);
        currentActiveImageIndex = false;
    } else {

        // close any other open images first
        if($('.active-image').length) {

            var activeImageId = $('.active-image').find('img').attr('attr-id');

            if(activeImageId != image.id) {
                shrinkImage(images[activeImageId]);
            }

        }



        var scrollTop = (docHeight - $(window).height()) * ( image.gps_index / gps.length );
        image.scrollDistance = scrollTop - $(document).scrollTop();

        if(image_container_multiplier.scrollDistance > 10) {
            // scroll to then grow
            scrollTo(image.gps_index, duration, growImage, [image]);
        } else {
            // do both at the same time
            var duration = 1000;
            scrollTo(image.gps_index, duration);
            growImage(image);
        }

        currentActiveImageIndex = parseInt($(this).attr('attr-id'));
    }

}

function growImage(image, callback, callback_args) {

    // duration = typeof duration == 'undefined' ? 400 : duration;
    var duration = 400;

    image.savedWidth = image.$imageWrap.width();
    image.savedHeight = image.$imageWrap.height();
    image.savedLeft = image.$imageWrap.css('left');

    var height = $(window).height() - 40;
    if(image.$image[0].naturalHeight < height) {
        height = image.$image[0].naturalHeight;
    }

    var aspRatio = image.$image[0].naturalWidth / image.$image[0].naturalHeight;
    var new_width = height * aspRatio;

    var border = ($(window).height() - height) / 2;

    var top = border - $('#images').position().top;

    image.$imageWrap.addClass('active-image');

    var left = Math.abs($('#inner-images').position().left)  + ($(window).width() / 2 ) - ( new_width / 2 );

    left = left + (image.scrollDistance * image_container_multiplier);

    image.$imageWrap.animate({
        top:  top,
        left:  left,
        width:  new_width,
        height:  height,
    }, {
        duration: duration,
        complete: function() {

            if(typeof(callback) != 'undefined' && typeof callback == 'function') {
                callback_args = typeof callback_args == 'undefined' ? [] : callback_args;
                var arg1 = typeof(callback_args[0]) == 'undefined' ? null : callback_args[0];
                var arg2 = typeof(callback_args[1]) == 'undefined' ? null : callback_args[1];
                callback(arg1, arg2);
            }

        },
        step: function() {
            addMarkerShadows();
        }
    });
}

function shrinkImage(image, callback, callback_args) {
    // duration = typeof duration == 'undefined' ? 400 : duration;
    var duration = 400;
    image.$imageWrap.animate({
        top:  0,
        left:  image.savedLeft,
        width:  image.savedWidth,
        height:  image.savedHeight,
    }, {
        duration: duration,
        complete: function() {
            $(this).removeClass('active-image');

            if(typeof(callback) != 'undefined' && typeof callback == 'function') {
                callback_args = typeof callback_args == 'undefined' ? [] : callback_args;
                var arg1 = typeof(callback_args[0]) == 'undefined' ? null : callback_args[0];
                var arg2 = typeof(callback_args[1]) == 'undefined' ? null : callback_args[1];
                var arg3 = typeof(callback_args[2]) == 'undefined' ? null : callback_args[2];
                var arg4 = typeof(callback_args[3]) == 'undefined' ? null : callback_args[3];
                callback(arg1, arg2, arg3, arg4);
            }

        },
        step: function() {
            addMarkerShadows();
        }
    });
}

function scrollTo(gps_index, duration, callback, callback_args) {
    duration = typeof duration == 'undefined' ? 1000 : duration;
    var scrollTop = (docHeight - $(window).height()) * ( gps_index / gps.length );
    var dist = scrollTop - $(document).scrollTop();

    $("html, body").animate({ scrollTop: scrollTop }, {
        duration: duration,
        complete: function(){
            if(typeof(callback) != 'undefined' && typeof callback == 'function') {
                callback_args = typeof callback_args == 'undefined' ? [] : callback_args;
                var arg1 = typeof(callback_args[0]) == 'undefined' ? null : callback_args[0];
                var arg2 = typeof(callback_args[1]) == 'undefined' ? null : callback_args[1];
                callback(arg1, arg2);
            }
        }
    });

    return dist;

}

function show_line(i) {

    if(typeof gps[i].line == 'undefined') {

        gps[i].line = new google.maps.Polyline({
            path: [ gps[i-1].LatLng, gps[i].LatLng ],
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: map
        });
        gps[i].visible = true;

    }

    // Show camera track line
    if(showCameraTrack) {
        if(typeof gps[i].line2 == 'undefined') {

            gps[i].line2 = new google.maps.Polyline({
                path: [
                    new google.maps.LatLng(gps[i-1].track[0], gps[i-1].track[1]),
                    new google.maps.LatLng(gps[i].track[0], gps[i].track[1])
                ],
                strokeColor: "#FFFF00",
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map: map
            });

        }
    }


    if(!gps[i].visible) {
        gps[i].line.setMap(map);
        gps[i].visible = true;

        if(showCameraTrack) {
            gps[i].line2.setMap(map);
        }
    }

    distance += gps[i].distance;
}

function hide_line(i) {

    if(typeof gps[i].visible != 'undefined' && gps[i].visible) {
        gps[i].line.setMap(null);
        gps[i].visible = false;

        if(showCameraTrack) {
            gps[i].line2.setMap(null);
        }
    }

}

function addMarkerShadows() {

    $('#overlay').attr('width', $(window).width());
    $('#overlay').attr('height', $(window).height());

    var c = document.getElementById('overlay');
    var ctx = c.getContext('2d');

    ctx.clearRect(0, 0, c.width, c.height);

    distToClosestImage = '';

    for (var i = 0; i <= images.length -1; i++) {

        var image = images[i];

        if(isNaN(gps_index)) {
            gps_index = 0;
        }

        var distFromFocus = Math.abs(image.gps_index - gps_index);

        if(distToClosestImage == '' || distFromFocus < distToClosestImage) {
            distToClosestImage = distFromFocus;
        }

        var shadowOpacity;
        if(distFromFocus > 100) {
            shadowOpacity = 0;
        } else {
            shadowOpacity = (Math.abs(distFromFocus - 300) / 300) - 0.25;
        }

        image.markerXy = fromLatLngToPoint(image.marker.position, map)

        var offset = image.$imageWrap.offset();

        var topLeft = {
            x: offset.left,
            y: offset.top - $(document).scrollTop() + image.$image.height()
        };
        var topRight = {
            x: offset.left + image.$image.width(),
            y: offset.top - $(document).scrollTop() + image.$image.height()
        };
        var bottomLeft = {
            x: image.markerXy.x - 5,
            y: image.markerXy.y
        };
        var bottomRight = {
            x: image.markerXy.x + 5,
            y: image.markerXy.y
        };

        // Calc distance from marker to image
        var a = image.markerXy.x - offset.left + (image.$image.width() / 2);
        var b = image.markerXy.y - offset.top;
        image.distance = Math.sqrt( a*a + b*b );

        // Create gradient
        image.grd = ctx.createRadialGradient(image.markerXy.x, image.markerXy.y, image.distance / 1.5, image.markerXy.x, image.markerXy.y, (image.distance / 4));
        image.grd.addColorStop(0, 'rgba(255, 255, 255, 0)');
        image.grd.addColorStop(1, 'rgba(255, 255, 255, ' + shadowOpacity + ')');

        ctx.fillStyle = image.grd;

        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomLeft.x, bottomLeft.y);
        ctx.closePath();
        ctx.fill();

    }

}

function fromLatLngToPoint(latLng, map) {
    var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
    var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
    var scale = Math.pow(2, map.getZoom());
    var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
    return new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
}

function debug(info) {
    var html = '';
    $.each(info, function (key, val) {
        html = html + key + ': ' + val + '<br>';
    });
    $debug.html(html);
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}