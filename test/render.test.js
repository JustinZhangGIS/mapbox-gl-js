'use strict';

var Map = require('../js/ui/map');
var browser = require('../js/util/browser');
var suite = require('mapbox-gl-test-suite');

var tests;

if (process.argv[1] === __filename && process.argv.length > 2) {
    tests = process.argv.slice(2);
}

suite.run('js', {tests: tests}, function(style, options, callback) {
    browser.devicePixelRatio = options.pixelRatio;

    var map = new Map({
        container: {
            offsetWidth: options.width,
            offsetHeight: options.height,
            classList: {
                add: function() {}
            }
        },
        center: [options.center[1], options.center[0]],
        zoom: options.zoom,
        bearing: options.bearing,
        style: style,
        classes: options.classes,
        interactive: false,
        attributionControl: false
    });

    var gl = map.painter.gl;

    map.painter.prepareBuffers = function() {
        var gl = this.gl;

        if (!gl.renderbuffer) {
            // Create default renderbuffer
            gl.renderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, gl.renderbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }

        if (!gl.stencilbuffer) {
            // Create default stencilbuffer
            gl.stencilbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, gl.stencilbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }

        if (!gl.framebuffer) {
            // Create frame buffer
            gl.framebuffer = gl.createFramebuffer();
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, gl.renderbuffer);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, gl.stencilbuffer);

        this.clearColor();
    };

    map.painter.bindDefaultFramebuffer = function() {
        var gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
    };

    map.once('load', function() {
        var w = options.width * browser.devicePixelRatio,
            h = options.height * browser.devicePixelRatio;

        var data = new Buffer(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);

        map.remove();
        gl.destroy();

        // Flip the scanlines.
        var stride = w * 4;
        var tmp = new Buffer(stride);
        for (var i = 0, j = h - 1; i < j; i++, j--) {
            var start = i * stride;
            var end = j * stride;
            data.copy(tmp, 0, start, start + stride);
            data.copy(data, start, end, end + stride);
            tmp.copy(data, end);
        }

        callback(null, data);
    });
});
