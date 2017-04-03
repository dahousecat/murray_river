var utils = {
    getParameterByName: function(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },
    debug: function(info) {
        var html = '';
        $.each(info, function (key, val) {
            html = html + key + ': ' + val + '<br>';
        });
        $debug.html(html);
    },
    callback: function(callback) {
        if(typeof callback == 'function') {
            callback();
        }
    }
};
