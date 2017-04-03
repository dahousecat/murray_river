
// $('#images').on('mousedown', '.arrow', function (evt) {
//     scrolling = true;
//     startScrolling($('body'), 40, $(this).attr('id'));
// }).on('mouseup', function () {
//     scrolling = false;
//     clearTimeout(scrollTimer);
// });



// $('html, body').css({left: $('html, body').scrollTop(0)});
//
// $('html, body').animate({
//     //scrollTop:  $('html, body')[0].scrollHeight
//     left:  $('html, body')[0].scrollHeight
// }, {
//     duration: timeout,
//     easing : 'linear',
//     step: function( value, fx ) {
//
//         console.clear();
//         console.log(value);
//
//         $('html, body').scrollTop(value);
//
//         // var data = fx.elem.id + " " + fx.prop + ": " + scrollTop;
//         // console.log(data);
//         // $( "body" ).append( "<div>" + data + "</div>" );
//     }
// });

function startScrolling(obj, speed, btn) {

    if(!scrolling) {
        return;
    }

    var distPxToClosestImage = getDistPxToClosestImage();

    var maxInfulenceDist = 300;
    var max_speed = 150;
    var min_speed = 30;
    var speed = max_speed;

    if(distPxToClosestImage < maxInfulenceDist) {

        var t = 1 - ( distPxToClosestImage / maxInfulenceDist );
        var eased = 1 - EasingFunctions.easeInQuad(t);

        var max = eased * max_speed;
        var min = ( 1 - eased ) * min_speed;

        speed = max + min;

    }

    //$('#debug').html('Speed: ' + speed);

    console.clear();
    console.log('Speed ' + speed);
    // //console.log('Drag ' + imgDragFactor);
    // console.log('Dist ' + distPxToClosestImage);

    //var travel = (btn == 'back') ? '-=' + speed + 'px' : '+=' + speed + 'px';

    // var top = $(window).scrollTop();
    //
    // console.log('Top before ' + top);
    //
    // if(btn == 'back') {
    //     top = top - speed;
    //     console.log('back');
    // } else {
    //     top = top + speed;
    //     console.log('forward');
    // }

    //console.log('Top after ' + top);

    // window.scrollTo(top, 0);

    //$(document).scrollTop(top);

    // var fps = 5;
    // var timeout = 1000 / fps;

    // if(scrolling) {
    //     scrollTimer = setTimeout(function(){
    //
    //         startScrolling(obj, speed, btn);
    //
    //     }, timeout);
    // }

    // var timeout = 400;
    //
    // divisor = 20;
    //
    // speed = speed / divisor;
    timeout = 100;
    //
    var travel = (btn == 'back') ? '-=' + speed + 'px' : '+=' + speed + 'px';
    //
    if (!scrolling) {
        obj.stop();
    } else {

        // recursively call startScrolling while mouse is pressed
        // obj.animate({
        //     "scrollTop": travel
        // }, timeout, function () {
        //     if (scrolling) {
        //         startScrolling(obj, speed, btn);
        //     }
        // });

        $('html, body').animate({
            scrollTop:  $('html, body')[0].scrollHeight
        }, {
            step: function( scrollTop, fx ) {
                var data = fx.elem.id + " " + fx.prop + ": " + scrollTop;
                console.log(data);
                // $( "body" ).append( "<div>" + data + "</div>" );
            }
        });

        // $('html, body').animate({
        //     scrollTop: target.offset().top
        // }, 1000);

    }
}

function getDistPxToClosestImage() {

    var windowWidth = $(window).width();

    var lowestDist = '';
    var dist, pos;

    for (i = 0; i <= images.length -1; i++) {

        pos = $('#image-' + i).offset();
        dist = Math.abs(pos.left - ( windowWidth / 2 ));
        if(lowestDist == '' || dist < lowestDist) {
            lowestDist = dist;
        }

    }

    return lowestDist;

}