var adventure = {
    scrollPerc: 0,
    pxPerGpsPoint: 2,
    animating: false,
    days: [],
    $stats: null,

    init: function() {

        gps.currentDay = utils.getParameterByName('day');
        gps.currentDay = gps.currentDay == null ? 1 : gps.currentDay;
        adventure.$stats = $('#stats');

        async.series([
                function(callback){

                    gps.callback = callback;
                    gps.load(adventure.day);

                },
                function(callback){

                    map.create();
                    gps.setCameraTrack();

                    adventure.setDimensions();

                    image.callback = callback;
                    image.add();

                },
            ],
            function(err, results){
                // done
                adventure.showStats();
            });

    },

    setDimensions: function() {

        this.windowHeight = $(window).height();
        this.docHeight = gps.count * this.pxPerGpsPoint;
        $('#spacer').height(adventure.docHeight);

    },

    scrollTo: function(gps_index, callback) {

        var currentScrollTop = (this.docHeight - this.windowHeight) * ( gps.index / gps.count );
        var scrollTop = (this.docHeight - this.windowHeight) * ( gps_index / gps.count );
        var dist = scrollTop - currentScrollTop;

        var max_duration = 1500;
        var min_duration = 100;
        var dist_limit = 500;

        // Set duration based off distance
        var t = dist > dist_limit ? 1 : (Math.abs(dist) / dist_limit);
        var max = t * max_duration;
        var min = (1 - t) * min_duration;
        var duration = min + max;

        $("html, body").animate({ scrollTop: scrollTop }, {
            duration: duration,
            complete: function() {
                if($(this).prop('tagName') == 'BODY') {
                    utils.callback(callback);
                }
            }
        });

        return dist;

    },

    showHideNextPrevDayButtons: function() {

        if(adventure.scrollPerc < 0.02 && gps.currentDay != 1) {
            $('#back').addClass('day');
        } else {
            $('#back').removeClass('day');
        }

        if(adventure.scrollPerc > 0.98 && gps.currentDay != adventure.days.length) {
            $('#forward').addClass('day');
        } else {
            $('#forward').removeClass('day');
        }

    },

    nextDay: function() {

        // replace current day with 1 line
        gps.drawDayLine();
        for (i = 0; i <= gps.count -1; i++) {
            gps.hideLine(i);
        }

        gps.currentDay = parseInt(gps.currentDay) + 1;

        async.series([
                function(callback){

                    gps.callback = callback;
                    gps.data = [];
                    gps.dayCounts = {};
                    gps.load();

                },
                function(callback){

                    gps.cameraTrack = [];
                    gps.setCameraTrack();

                    $('#inner-images').html('');

                    image.callback = callback;
                    image.images = [];
                    image.clusters = [];
                    image.add();

                    adventure.animating = false;

                    document.body.scrollTop = document.documentElement.scrollTop = 0;

                },
            ],
            function(err, results){
                // done
            });

    },

    prevDay: function() {

        gps.currentDay = parseInt(gps.currentDay) - 1;

        // remove current day lines
        for (i = 0; i <= gps.count -1; i++) {
            gps.hideLine(i);
        }

        // remove previous days single line
        adventure.days[gps.currentDay].line.setMap(null);

        async.series([
                function(callback){

                    gps.callback = callback;
                    gps.data = [];
                    gps.dayCounts = {};
                    gps.load();

                },
                function(callback){

                    gps.cameraTrack = [];
                    gps.setCameraTrack();

                    $('#inner-images').html('');

                    image.callback = callback;
                    image.images = [];
                    image.clusters = [];
                    image.add();

                    adventure.animating = false;

                    document.body.scrollTop = document.documentElement.scrollTop = document.body.scrollHeight;

                },
            ],
            function(err, results){
                // done
            });

    },

    showStats: function() {

        var info = {
            Day: gps.currentDay,
            Date: adventure.day + '/' + adventure.month + '/' + adventure.year,
            Average_speed: gps.avgSpeed + 'km/h',
            Distance: gps.formattedDistance(),
            Total_distance: gps.formattedTotalDistance(),
            Time: gps.getTime(),
        };

        var html = '';
        $.each(info, function (key, val) {
            html = html + key.replace('_', ' ') + ': ' + val + '<br>';
        });
        adventure.$stats.html(html);

    }

};

$(window).scroll(function() {

    adventure.scrollPerc = $(window).scrollTop() / (adventure.docHeight - adventure.windowHeight);
    gps.index = Math.round( gps.count * adventure.scrollPerc );

    gps.showHideLines();

    map.setCentre();

    image.setScrollPosition();
    //image.setImageSizes();

    adventure.showHideNextPrevDayButtons();
    adventure.showStats();

});

$(document).ready(function() {

    $('.arrow').click(function() {

        if($(this).hasClass('day')) {
            if($(this).attr('id') == 'forward') {
                return adventure.nextDay();
            } else {
                return adventure.prevDay();
            }
        }

        // Don't run whilst already animating
        if(adventure.animating) {
             // console.log('reject click');
            return;
        }

        adventure.animating = true;
        // console.log('animating true');

        var img = $(this).attr('id') == 'forward' ? image.findNext() : image.findPrev();

         // console.log(img, 'img');

        // Make sure we are not already at the end
        if(!img) {

             console.log('no image, scroll to end');

            // If no image scroll right to the end or start of the track
            var scrollToIndex = $(this).attr('id') == 'forward' ? gps.count : 0;

            // console.log('scrollToIndex: ' + scrollToIndex);

            async.series([
                    function(callback){
                        image.shrinkActive(callback);
                    },
                    function(callback){
                        adventure.scrollTo(scrollToIndex, callback);
                    },
                ],
                function(err, results){
                    adventure.animating = false;
                    // console.log('animating false');
                });

            return;
        }

        // console.log('arrow click get image.activeImageIndex: ' + image.activeImageIndex);

        // Is there an open image?
        if(image.activeImageIndex !== false) {

            // Save the inital position of the image container
            image.initialPosLeft = ( ($(window).scrollTop() + adventure.windowHeight * adventure.scrollPerc) * image.containerWidthMultiplier ) * -1;

            async.series([
                    function(callback){

                        // shrink
                        image.shrinkActive(callback);
                        // console.log('shrink');

                    },
                    function(callback){

                        // console.log('scroll');

                        // scroll
                        var dist = adventure.scrollTo(img.gps_index, callback);

                        // Find out what the new position of the image container will be and save the distance.
                        var newPosLeft = ( ($(window).scrollTop() + dist + adventure.windowHeight * adventure.scrollPerc) * image.containerWidthMultiplier ) * -1;
                        image.scrollDist = newPosLeft - image.initialPosLeft;

                    },
                    function(callback){

                        // console.log('grow');

                        // grow
                        image.grow(img, callback);

                    },

                ],
                function(err, results){
                    adventure.animating = false;
                    // console.log('animating false');
                });

        } else {

            async.series([
                    function(callback){
                        // console.log('no active - scroll to');
                        adventure.scrollTo(img.gps_index, callback);
                    },
                ],
                function(err, results){
                    adventure.animating = false;
                    // console.log('animating false');
                });

        }

    });

});