/*global describe,it*/

var chai = require('chai'),
    proxyquire = require('proxyquire'),
    sinon = require('sinon');
chai.should();

describe('scraper', function () {

    var Scraper, requestMock;

    beforeEach(function () {
        requestMock = sinon.mock({
            'get': function () {
            }
        });
        Scraper = proxyquire('../lib/scraper', {
            request: requestMock
        });
    });

    it('should call through to request.get', function () {

    });
});