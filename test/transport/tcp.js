'use strict';

var SyslogStream = require('../../lib/syslog'),
    net = require('net');

var Promise = require('bluebird');

require('should');

describe('TCP transport', function () {
    var server, bindPort = 14243;
    
    beforeEach(function (done) {
        server = net.createServer();
        server.listen(bindPort, done);
    });
    
    afterEach(function (done) {
        server.close(done);
    });
    
    it('should call the callback on connect', function (done) {
        var syslog = new SyslogStream({
            type: 'tcp',
            port: bindPort
        }, function () {
            syslog.end(done);
        });
    });
    
    it('should return a promise when calling .end()', function () {
        var syslog = new SyslogStream({
            type: 'tcp',
            port: bindPort
        });
        return syslog.end();
    });
    
    it('should support a callback when calling .end()', function (done) {
        var syslog = new SyslogStream({
            type: 'tcp',
            port: bindPort
        });
        syslog.end(done);
    });
    
    it('should connect and pass messages', function (done) {
        var syslog = new SyslogStream({
            type: 'tcp',
            port: bindPort
        });
        server.once('connection', function (socket) {
            socket.once('data', function (chunk) {
                syslog.end(done);
            });
        });
        syslog.write('foo');
    });
    
    it('should emit an error event on socket errors', function (done) {
        var syslog = new SyslogStream({
            type: 'tcp',
            port: bindPort
        });
        server.once('connection', function (socket) {
            syslog.transport.then(function (stream) {
                stream.emit('error', 'foo');
                socket.end();
            });
        });
        syslog.once('error', function (err) {
            err.should.equal('foo');
            done();
        });
    });

    it('should attempt to reconnect on a write error', function (done) {
        var syslog = new SyslogStream({
            type: 'tcp',
            port: bindPort
        });

        syslog.on('error', function (err) {
            // intentionally disabled
            //console.log('error:', err);
        });

        syslog._writeToStream = function () {
            delete syslog._writeToStream;
            return Promise.reject('retry');
        };
        
        server.on('connection', function (socket) {
            socket.once('data', done.bind(null, null));
            syslog.end('foo');
        });
    });
    
    it('should give up trying to write after too many retries', function (done) {
        var syslog = new SyslogStream({
            type: 'tcp',
            port: bindPort
        });

        syslog.on('error', function (err) {
            // intentionally disabled
            //console.log('error:', err);
        });

        syslog._writeToStream = function () {
            return Promise.reject('retry');
        };
        
        server.on('connection', function (socket) {
            socket.once('data', done.bind(null, null));
            delete syslog._writeToStream;
            syslog.end(done);
        });
    });
});